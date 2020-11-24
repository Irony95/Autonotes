import React from "react";
import p5 from "p5";
import * as tf from '@tensorflow/tfjs';



//This is the processing sketch, used in instance mode
const sketch = ( s ) => 
    {        
        const catergories = ['!', '(', ')', '+', ',', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                             '=', 'A', 'alpha', 'ascii_124', 'b', 'beta', 'C', 'cos', 'd', 'Delta', 'div', 'e',
                              'exists', 'f', 'forall', '/', 'G', 'gamma', 'geq', 'gt', 'H', 'i', 'in',
                               'infty', 'int', 'j', 'k', 'l', 'lambda', 'ldots', 'leq', 'lim', 'log', 'lt', 'M', 'mu',
                                'N', 'neq', 'o', 'p', 'phi', 'π', 'pm', 'prime', 'q', 'R', '→', 'S', 'sigma',
                                 'sin', 'sqrt', 'sum', 'T', 'tan', 'Θ', 'times', 'u', 'v', 'w', 'X', 'y', 'z', '[', ']', '{', '}']
        let model;        
        let lastGuess = "";
        const backgroundColor = s.color(200, 200, 180);
        const NNInputSize = 45;

        let allLines = [];
        let currentLine = [];

        s.setup = () => {
            loadModel();
            s.createCanvas(s.displayWidth-100, s.displayHeight-500);
            s.background(backgroundColor);
            s.strokeWeight(3);
            s.textAlign(s.LEFT, s.TOP);
        };
        
        s.draw = () => {
            //clear the background
            s.background(backgroundColor);
            
            s.text(lastGuess, 0, 0);

            if (s.mouseIsPressed)
            {
                let point = s.createVector(s.mouseX, s.mouseY)
                currentLine.push(point);
            }
            s.noFill();
            //redraw all the lines
            allLines.forEach(line => {
                s.beginShape();
                line.path.forEach(point => {
                    s.vertex(point.x, point.y);
                });
                s.endShape();
            });
            s.fill(0, 0, 0);
        };

        s.mousePressed = () => 
        {            
            allLines.push({
                path : currentLine,
                dataArray : null,
                center : null 
            });
        }

        s.mouseReleased = () =>
        {
            let written = getStrokeArray(currentLine);
            currentLine.dataArray = 
            currentLine = [];
            let data = tf.tensor(written, [1, 2025]);          
            getMostLikely([data]);
        }

        s.keyTyped = () =>
        {
            //clears all saved lines
            if (s.keyCode === 67)
            {
                allLines = [];
            }
        }

        function getMostLikely(data)
        {
            let prediction = model.predict([ data[0] ]);
            let guess;
            prediction.array().then(data => {
                var max = data[0].reduce(function(a, b) {
                    return Math.max(a, b);
                });
                lastGuess = catergories[data[0].indexOf(max)];
            })
        }

        async function loadModel()
        {
            console.log("loading model");
            model = await tf.loadLayersModel("http://localhost:8080/model.json");
            console.log("loaded model");
        }

        //takes in the array of points, and returns the array that feeds into the Neural Network that recognises the math symbol
        function getStrokeArray(line)
        {            
            let topLeft = s.createVector(s.width,s.height)
            let bottomRight = s.createVector(0,0)
            line.forEach(point => {
                if (point.x < topLeft.x)
                {
                    topLeft.x = point.x
                }
                if (point.y < topLeft.y)
                {
                    topLeft.y = point.y
                }
                if (point.x > bottomRight.x)
                {
                    bottomRight.x = point.x
                }
                if (point.y > bottomRight.y)
                {
                    bottomRight.y = point.y
                }
            });
            let maxWidth = bottomRight.x-topLeft.x > bottomRight.y-topLeft.y ? bottomRight.x-topLeft.x : bottomRight.y-topLeft.y;
            let centerOffset = s.createVector((maxWidth - (bottomRight.x-topLeft.x)) /2, (maxWidth - (bottomRight.y-topLeft.y))/2 );
            //outputed array is more than 45**2

            let resizedLines = []
            //remap all the points onto the resized array, of which the dimensions are NNInputSize
            let scale = (NNInputSize-1)/maxWidth;
            line.forEach(point => {
                let loc = s.createVector(Math.round((point.x-topLeft.x+ centerOffset.x)*scale ), Math.round((point.y-topLeft.y+ centerOffset.y)*scale ));  
                resizedLines.push(loc);                
            });
            let resizedArray = new Array(NNInputSize**2).fill(0);            
            //loop through all the points, and connect them together
            for (let i = 0;i < resizedLines.length;i++)
            {
                if (i !== line.length-1)
                {                    
                    let repeatTimes = Math.ceil( Math.sqrt( (line[i].x-line[i+1].x)**2 + (line[i].y-line[i+1].y)**2 ) );

                    //if the line is vertical, a graident is not possible
                    //therefore, we use a different function to fill in the points
                    if (Math.abs(resizedLines[i].x-resizedLines[i+1].x) === 0)                    
                    {
                        for (let j = 0;j<Math.abs(resizedLines[i].y-resizedLines[i+1].y);j++)
                        {
                            let indexToChange = resizedLines[i].x + NNInputSize*(resizedLines[i].y - j*Math.sign(resizedLines[i].y-resizedLines[i+1].y));//
                            resizedArray[indexToChange] = 1.0
                        }
                    }
                    //calculate gradient, then fill in the line inbetween two points
                    else
                    {
                        let gradient = (resizedLines[i].y-resizedLines[i+1].y)/(Math.abs(resizedLines[i].x-resizedLines[i+1].x));
                        let direction = Math.sign(resizedLines[i].x-resizedLines[i+1].x);
                        
                        for (let j = 0;j < repeatTimes;j++)
                        {   
                            let xCoord = s.map(j, 0, repeatTimes, 0, Math.abs(resizedLines[i].x-resizedLines[i+1].x));
                            let indexToChange = resizedLines[i].x-(direction*Math.round(xCoord)) + NNInputSize*Math.round((resizedLines[i].y-gradient*xCoord));
                            resizedArray[indexToChange] = 1.0
                        }
                    }                    
                }
                resizedArray[Math.round(resizedLines[i].x + NNInputSize*resizedLines[i].y)] = 1.0
            }
            return resizedArray;
        }
    };



class Whiteboard extends React.Component
{
    constructor()
    {
        super();
        this.board = React.createRef();
    }

    componentDidMount() {
        this.myP5 = new p5(sketch, this.board.current)
    }

    render()
    {        
        return (
            <div id="whiteboard" ref={this.board}></div>
        );
    }
}
export default Whiteboard;