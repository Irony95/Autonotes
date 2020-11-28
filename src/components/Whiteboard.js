import React from "react";
import p5 from "p5";
import * as tf from '@tensorflow/tfjs';



//This is the processing sketch, used in instance mode
const sketch = ( s ) => 
    {        
        const catergories = ['!', '(', ')', '+', ',', '―', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                             '=', 'A', 'α', '|', 'b', 'ß', 'C', 'cos', 'd', 'Δ', 'div', 'e',
                              '∃', 'f', '∀', '/', 'G', 'γ', '≥', '>', 'H', 'i', 'in',
                               '∞', '⨜', 'j', 'k', 'l', 'λ', 'ldots', '≤', 'lim', 'log', '<', 'M', 'mu',
                                'N', '≠', 'o', 'p', 'ϕ', 'π', '±', 'prime', 'q', 'R', '→', 'S', 'σ',
                                 'sin', '√', 'Σ', 'T', 'tan', 'Θ', '×', 'u', 'v', 'w', 'X', 'y', 'z', '[', ']', '{', '}']
        let model;        
        let lastGuess = "";
        const backgroundColor = s.color(200, 200, 180);
        const networkInputSize = 45;
        const considerDeltaTime = 3000;

        let allLines = [];
        let allSymbols = [];
        let currentLine = {
            path : [],
            border : null,
            text : null,
            timeFinished : null
        };

        //the different possibilities of what is drawn could be
        s.setup = () => {
            loadModel();
            s.createCanvas(1200, 900);
            s.strokeWeight(7);
            s.textAlign(s.LEFT, s.TOP);
            s.background(backgroundColor);
        };
        
        s.draw = () => {
            //clear the background
            s.background(backgroundColor);
            
            s.text(lastGuess, 0, 0);

            if (s.mouseIsPressed)
            {
                let point = s.createVector(s.mouseX, s.mouseY)
                currentLine.path.push(point);
            }

            s.noFill();
            //redraw all the lines
            allLines.forEach(line => {
                if (line.text == null)
                {
                    s.beginShape();
                    line.path.forEach(point => {
                        s.vertex(point.x, point.y);
                    });
                    s.endShape();
                }
            });
            s.fill(0, 0, 0);
            allSymbols.forEach(symbol => {
                s.textSize(symbol.textSize);                
                s.text(symbol.text, symbol.border.topLeft.x + (symbol.border.maxWidth - s.textWidth(symbol.text))/2, symbol.border.topLeft.y);                
            });

        };

        s.mousePressed = () => 
        {           
            currentLine = {
                path : [],
                border : null,
                text : null,
                timeFinished : null
            };
            allLines.push(currentLine);
        }

        s.mouseReleased = () =>
        {
            let borderInfo = getBorder([currentLine.path]);
            currentLine.timeFinished = Date.now();
            currentLine.border = borderInfo;       
        }

        s.keyTyped = () =>
        {
            //convert Last Written number into text C
            if (s.keyCode === 67 && currentLine.path.length !== 0)
            {
                let nearbyPaths = getPossiblePaths(currentLine); 
                console.log(nearbyPaths);               
                let featuresToCheck = []
                nearbyPaths.forEach(path => {
                    console.log(getStrokeArray(path).join(""));
                    featuresToCheck.push([getStrokeArray(path), path]);
                });
                getMostLikely(featuresToCheck);
            }
            //clear onscreen things R
            else if (s.keyCode === 82)
            {
                allLines = [];
                allSymbols = [];
            }
            //S
            else if (s.keyCode === 83)
            {
                console.log(allLines);
            }
        }

        async function getMostLikely(data)
        {
            let probabilityOfSymbols = []
            //loop through all the symbols in data, then compile it into the probabilty of symbols array
            await data.forEach(potentialSymbol => {
                let set = tf.tensor(potentialSymbol[0], [1, 2025]);
                let prediction = model.predict([set]).arraySync()[0];
                let max = prediction.reduce((a, b) => {
                    return Math.max(a, b);
                });
                probabilityOfSymbols.push({
                    probValue : max,
                    label : catergories[prediction.indexOf(max)],
                    lines : potentialSymbol[1]
                });
            });
            let symbol = probabilityOfSymbols[probabilityOfSymbols.length-1]; //TODO:change to the value with highest probability
            let symbolBorder = getBorder(symbol.lines);            
            allSymbols.push({
                text : symbol.label,
                border : symbolBorder,
                textSize : symbolBorder.maxWidth
            });
            //remove the lines that got converted
            symbol.lines.forEach(line => {
                allLines.splice(allLines.indexOf(line), 1);
            });
        }

        async function loadModel()
        {
            console.log("loading model");
            model = await tf.loadLayersModel("http://localhost:8080/model.json");
            console.log("loaded model");
        }

        function getPossiblePaths(mainLine)
        {
            let borderInfo = getBorder([mainLine.path]);
            let nearbyPaths = [mainLine.path]
            let possiblePaths = [];
            possiblePaths.push([...nearbyPaths]);
            allLines.forEach(line => {
                if (line !== mainLine)
                {                  
                    //look for any nearby lines
                    if (line.border.topLeft.x + line.border.maxWidth > borderInfo.topLeft.x && line.border.topLeft.x < borderInfo.topLeft.x + borderInfo.maxWidth)
                    {
                        if (line.border.topLeft.y + line.border.maxWidth > borderInfo.topLeft.y && line.border.topLeft.y < borderInfo.topLeft.y + borderInfo.maxWidth)
                        {    
                            nearbyPaths.push(line.path);
                            possiblePaths.push([...nearbyPaths]);
                            borderInfo = getBorder(nearbyPaths);
                        }
                    }
                    //look for lines that were drawn within considerDeltaTime of the main line
                    else if (Math.abs(mainLine.timeFinished-line.timeFinished) <= considerDeltaTime)                
                    {
                        nearbyPaths.push(line.path);
                        possiblePaths.push([...nearbyPaths]);
                        borderInfo = getBorder(nearbyPaths);
                    }
                }
            });
            return possiblePaths;
        }

        //takes in an array of lines, and returns the border information that surrounds the lines
        function getBorder(paths)
        {
            let topLeft = s.createVector(s.width,s.height)
            let bottomRight = s.createVector(0,0)
            paths.forEach(path => {
                path.forEach(point => {
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
            });
            let maxWidth = bottomRight.x-topLeft.x > bottomRight.y-topLeft.y ? bottomRight.x-topLeft.x : bottomRight.y-topLeft.y;  
            let centerOffset = s.createVector((maxWidth - (bottomRight.x-topLeft.x)) /2, (maxWidth - (bottomRight.y-topLeft.y))/2 );
            return {
                maxWidth : maxWidth,
                topLeft : s.createVector(topLeft.x-centerOffset.x, topLeft.y-centerOffset.y),
                bottomRight : s.createVector(bottomRight.x-centerOffset.x, bottomRight.y-centerOffset.y)
            };
        }

        //takes in the array of lines, and the border surrounding it, and returns an array of 1 and 0 to parse into model
        function getStrokeArray(paths, border = getBorder(paths))
        {               
            //remap all the points onto the resized array, of which the dimensions are networkInputSize
            let scale = (networkInputSize-1)/border.maxWidth;
            let resizedArray = new Array(networkInputSize**2).fill(0);            
            paths.forEach(path => {                
                let resizedLines = []
                path.forEach(point => {
                    let loc = s.createVector(Math.round((point.x-border.topLeft.x)*scale ), Math.round((point.y-border.topLeft.y)*scale ));  
                    resizedLines.push(loc);                
                });         
                //loop through all the points, and connect them together
                for (let i = 0;i < resizedLines.length;i++)
                {
                    if (i !== path.length-1)
                    {                    
                        let repeatTimes = Math.ceil( Math.sqrt( (path[i].x-path[i+1].x)**2 + (path[i].y-path[i+1].y)**2 ) );
    
                        //if the line is vertical, a graident is not possible
                        //therefore, we use a different function to fill in the points
                        if (Math.abs(resizedLines[i].x-resizedLines[i+1].x) === 0)                    
                        {
                            for (let j = 0;j<Math.abs(resizedLines[i].y-resizedLines[i+1].y);j++)
                            {
                                let indexToChange = resizedLines[i].x + networkInputSize*(resizedLines[i].y - j*Math.sign(resizedLines[i].y-resizedLines[i+1].y));//
                                resizedArray[indexToChange] = 1
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
                                let indexToChange = resizedLines[i].x-(direction*Math.round(xCoord)) + networkInputSize*Math.round((resizedLines[i].y-gradient*xCoord));
                                resizedArray[indexToChange] = 1
                            }
                        }                    
                    }
                    resizedArray[Math.round(resizedLines[i].x + networkInputSize*resizedLines[i].y)] = 1
                }
            });
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