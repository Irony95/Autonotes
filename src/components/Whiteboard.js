    import React from "react";
import p5 from "p5";
import * as tf from '@tensorflow/tfjs';




//This is the processing sketch, used in instance mode
const sketch = ( s ) => 
{        
    const catergories = 
    ['!','(',')','+','|','―','0','1','2','3','4','5','6','7','8','9','=','𝑎','α','|',
    '𝑏','β','𝑐','cos','𝑑','Δ','÷','𝑒','∃','𝑓','∀','𝑔','γ','≥','>','𝒉','𝑖','in','∞',
    '∫','𝑗','𝑘','ℓ','λ','≤','lim','log','<','𝑚','mu','𝑛','≠','𝑜','𝑝','ϕ','π','±','𝑞','𝑟','→',
    '𝑠','σ','sin','√','Σ','𝑡','tan','θ','×','𝑢','𝑣','𝑤','𝑥','𝑦','𝑧','[',']','{','}']
        let model;        
        let mathFont;
        const backgroundColor = s.color(230, 230, 241);
        const tools = {
            pen : {
                //X
                keyCode : 80,
                name : "pen",
                down : () => {
                    if (s.mouseX - panVector.x >= 0 && s.mouseX - panVector.x <= s.width && s.mouseY - panVector.y >= 0 && s.mouseY - panVector.y <= s.height)
                    {
                        latestLine = {
                            path : [],
                            border : null,
                            text : null,
                            timeFinished : null,
                            shouldAutoMatch : false
                        };
                        allLines.push(latestLine);
                    }
                },
                drag : () => {                    
                    let point = s.createVector(s.mouseX - panVector.x, s.mouseY - panVector.y)
                    latestLine.path.push(point);
                },
                release : () => {
                    let borderInfo = getBorder([latestLine.path]);
                    latestLine.timeFinished = Date.now();            
                    latestLine.border = borderInfo; 
                    latestLine.shouldAutoMatch = allowAutoMatch;
                }
            },
            eraser : {
                //S
                keyCode : 69,
                name : "eraser",
                down : () => {
                    
                },
                drag : () => {
                    s.fill(255, 100, 100);
                    s.ellipse(s.mouseX - panVector.x, s.mouseY - panVector.y, 10, 10);
                    allLines.forEach(line => {
                        if (s.mouseX - panVector.x > line.border.topLeft.x && s.mouseX - panVector.x < line.border.bottomRight.x)
                        {
                            if (s.mouseY - panVector.y > line.border.topLeft.y && s.mouseY - panVector.y < line.border.bottomRight.y)
                            {
                                allLines.splice(allLines.indexOf(line), 1);
                            }                        
                        }
                    });
                    allSymbols.forEach(symbol => {
                        if (s.mouseX - panVector.x > symbol.border.topLeft.x && s.mouseX - panVector.x < symbol.border.bottomRight.x)
                        {
                            if (s.mouseY - panVector.y > symbol.border.topLeft.y && s.mouseY - panVector.y < symbol.border.bottomRight.y)
                            {
                                allSymbols.splice(allSymbols.indexOf(symbol), 1);
                            }                        
                        }
                    });
                },
                release : () => {
                    
                }
            },
            pan : {
                //a
                keyCode : 65,
                name : "pan",
                down : () => {
                    mouseOffset = s.createVector(s.mouseX - panVector.x, s.mouseY - panVector.y);
                },
                drag : () => {
                    panVector = s.createVector(s.mouseX - mouseOffset.x, s.mouseY- mouseOffset.y);
                },
                release : () => {
                    return;
                }
            }
        }
        let currentTool = tools.pen;
        let panVector = s.createVector(0, 0);
        
        const networkInputSize = 45;
        //only allows a match once the previous one has been completely converted
        let allowNewMatch = true;
        let allowAutoMatch = true;
        const minimumMatchPercent = 0.6;
        const confidenceThreshold = 0.05;
        
        const considerDeltaTime = 700;
        const changeThresholdTime = 1500;
                
        const snapLocationMargin = 20;
        const snapSizeMargin = 50;
        
        let mouseOffset = s.createVector(0, 0);
        
        let allLines = [];
        let allSymbols = [];
        let latestLine = {
            path : [],
            border : null,
            text : null,
            timeFinished : null,
            shouldAutoMatch : false
        };
        
        s.setup = () => {
            mathFont = s.loadFont("/api/getFont");
            s.textFont(mathFont);
            loadModel();
            addButtonEventListeners();
            const toolBarDiv = document.getElementById('sidebar');
            s.createCanvas(window.innerWidth-toolBarDiv.offsetWidth-20, window.innerHeight-50);
            s.background(backgroundColor);
        };
        
        //The constant loop on screen
        s.draw = () => {
            //clear the background
            s.background(backgroundColor);
            s.translate(panVector.x, panVector.y);
            
            //show on screen the current window location
            s.textSize(20);
            s.stroke(0);
            s.strokeWeight(1);
            s.fill(0);
            s.text(''.concat("x:", panVector.x.toString(), ", y:", panVector.y.toString()), -panVector.x, -panVector.y+20);
            s.textSize(30);
            s.text(currentTool.name, -panVector.x, s.height-panVector.y);

            if (s.mouseIsPressed)
            {
                currentTool.drag();
            }
            
            //redraw all the lines
            allLines.forEach(line => {
                //auto match 
                if (allowNewMatch && line.shouldAutoMatch && Math.abs(line.timeFinished-Date.now()) >= changeThresholdTime)
                {
                    allowNewMatch = false;
                    let nearbyPaths = getPossiblePaths(line);
                    let featuresToCheck = [];
                    nearbyPaths.forEach(path => {
                        featuresToCheck.push(path);
                    });
                    matchWithSymbol(featuresToCheck);
                }
                //redraw all the lines
                if (line.text == null)
                {
                    s.noFill();
                    s.strokeWeight(7);
                    s.beginShape();
                    line.path.forEach(point => {
                        s.vertex(point.x, point.y);
                    });
                    s.endShape();
                }
            });

            //redraw all the text
            allSymbols.forEach(symbol => {
            
                s.textSize(symbol.textSize);   
                s.fill(0, 0, 0);
                s.strokeWeight(1);
                s.stroke(0);
                s.text(symbol.text, symbol.txtLoc.x, symbol.txtLoc.y);                
            });

        };

        s.mousePressed = () => 
        {     
            currentTool.down();
        }

        s.mouseReleased = () =>
        {
            currentTool.release();      
        }

        s.keyTyped = () =>
        {
            for (var tool in tools)
            {
                if (s.keyCode === tools[tool].keyCode)
                {
                    currentTool.release();
                    currentTool = tools[tool];
                }
            }

            //convert Last Written number into text: press letter C
            if (s.keyCode === 67 && latestLine.timeFinished != null)
            {
                let nearbyPaths = getPossiblePaths(latestLine);               
                let featuresToCheck = []
                nearbyPaths.forEach(path => {
                    featuresToCheck.push(path);
                });
                matchWithSymbol(featuresToCheck);
            }
            //clear onscreen things: press letter R
            else if (s.keyCode === 82)
            {
                allLines = [];
                allSymbols = [];
            }
            //z
            else if (s.keyCode === 90 && allSymbols.length !== 0)
            {
                allSymbols[allSymbols.length-1].paths.forEach(path => {
                    latestLine = {
                        path : path,
                        border : getBorder([path]),
                        text : null,
                        timeFinished : Date.now(),
                        shouldAutoMatch : false
                    };
                    allLines.push(latestLine);
                });                                
                allSymbols.pop();
            }
        }

        //takes in an array of features, paths, and will check through all and converts to the most likely  symbol
        async function matchWithSymbol(paths)
        {
            let probabilityOfSymbols = []
            await paths.forEach(path => {
                let feature = tf.tensor(getStrokeArray(path), [1, 45, 45, 1]);
                let prediction = model.predict([feature]).arraySync()[0];
                let max = prediction.reduce((a, b) => {
                    return Math.max(a, b);
                });
                probabilityOfSymbols.push({
                    probValue : max,
                    label : catergories[prediction.indexOf(max)],
                    paths : path
                });
            });
            let symbol = probabilityOfSymbols[probabilityOfSymbols.length-1];
            probabilityOfSymbols.reverse().forEach(smbl => {
                if (smbl.probValue - symbol.probValue >= confidenceThreshold)
                {
                    symbol = smbl;
                }
            }); 
            //we dont convert if the model is not confident in its guess 
            if (symbol.probValue < minimumMatchPercent)
            {
                allLines.forEach(line => {
                    symbol.paths.forEach(path => {
                        if (line.path === path)
                        {
                            line.shouldAutoMatch = false;
                        }
                    });
                });
                allowNewMatch = true;
                return;
            }
            //calculate the new Size, drawn text location
            let symbolBorder = getBorder(symbol.paths);
            let textToUse = symbol.label;

            //why does p5js have this bug
            //trying to get bounds of the closing bracket will return infinity, so i have to try and replace it with a similar text as otherwise the drawing 
            //system will break
            if (textToUse ===")")
            {
                textToUse = "(";
            }
            
            //allow for symbol to snap to nearby texts
            allSymbols.forEach(smbl => {
                if (Math.abs(smbl.border.maxWidth-symbolBorder.maxWidth) <= snapSizeMargin)
                {
                    if (Math.abs(smbl.border.bottomRight.y-symbolBorder.bottomRight.y) <= snapLocationMargin)
                    {
                        if (Math.abs(smbl.border.topLeft.x-symbolBorder.topLeft.x) <= smbl.border.maxWidth*1.5)
                        {
                            symbolBorder.maxWidth = smbl.border.maxWidth;                            
                            symbolBorder.topLeft.y = smbl.border.topLeft.y;
                            symbolBorder.bottomRight.y = smbl.border.bottomRight.y;
                        }
                    }
                }
            });     
            
            //all this is done so that the text is as close as possible to the drawn symbol
            let bounds = mathFont.textBounds(textToUse, symbolBorder.topLeft.x, symbolBorder.bottomRight.y, symbolBorder.maxWidth);
            let newSize = bounds.w > bounds.h ? symbolBorder.maxWidth * (symbolBorder.maxWidth/bounds.w) : symbolBorder.maxWidth * (symbolBorder.maxWidth/bounds.h);            
            let newBounds = mathFont.textBounds(textToUse, symbolBorder.topLeft.x, symbolBorder.bottomRight.y, newSize);
            let textLocation = s.createVector(symbolBorder.topLeft.x + (symbolBorder.maxWidth/2+symbolBorder.topLeft.x) - (newBounds.w/2+newBounds.x),
            symbolBorder.bottomRight.y - (newBounds.h/2+newBounds.y) +  (symbolBorder.topLeft.y+symbolBorder.maxWidth/2));
            allSymbols.push({
                text : symbol.label,
                border : symbolBorder,
                txtLoc : textLocation,
                textSize : newSize,
                paths : symbol.paths
            });

            //remove the lines that got converted
            let LinesToRemove = []
            allLines.forEach(line => {
                symbol.paths.forEach(path => {
                    if (line.path === path)
                    {
                        LinesToRemove.push(line);
                    }
                });
            });
            LinesToRemove.forEach(line => {
                allLines.splice(allLines.indexOf(line), 1);
            });
            allowNewMatch = true;
        }

        async function loadModel()
        {
            console.log("loading model");
            model = await tf.loadLayersModel("/api/getModel");
            console.log("loaded model");
        }

        function addButtonEventListeners()
        {
            const penButton = document.getElementById("penButton");
            const eraserButton = document.getElementById("eraserButton");
            const panButton = document.getElementById("panButton");
            const matchCheckbox = document.getElementById("matchCheckbox");

            penButton.addEventListener('click', ()=>{
                currentTool = tools["pen"];
            });
            eraserButton.addEventListener('click', ()=>{
                currentTool = tools["eraser"];
            });
            panButton.addEventListener('click', ()=>{
                currentTool = tools["pan"];
            });
            matchCheckbox.checked = allowAutoMatch;
            matchCheckbox.addEventListener("change", ()=> {
                allowAutoMatch = matchCheckbox.checked;
            });
        }

        //takes in a line, and returns all paths nearby, or that were drawn close in time
        function getPossiblePaths(mainLine)
        {
            let borderInfo = getBorder([mainLine.path]);
            let nearbyPaths = [mainLine.path]
            let possiblePaths = [];
            let latestTime = mainLine.timeFinished;
            possiblePaths.push([...nearbyPaths]);
            allLines.forEach(line => {
                if (line !== mainLine && line.timeFinished != null)
                {                                   
                    //look for any nearby lines
                    if (line.border.topLeft.x + line.border.maxWidth > borderInfo.topLeft.x && line.border.topLeft.x < borderInfo.topLeft.x + borderInfo.maxWidth &&
                        line.border.topLeft.y + line.border.maxWidth > borderInfo.topLeft.y && line.border.topLeft.y < borderInfo.topLeft.y + borderInfo.maxWidth)
                    { 
                        nearbyPaths.push(line.path);
                        possiblePaths.push([...nearbyPaths]);
                        borderInfo = getBorder(nearbyPaths);
                        latestTime = line.timeFinished;
                    }
                    //look for lines that were drawn within considerDeltaTime of the main line
                    else if (Math.abs(latestTime-line.timeFinished) <= considerDeltaTime)                
                    {
                        nearbyPaths.push(line.path);
                        possiblePaths.push([...nearbyPaths]);
                        borderInfo = getBorder(nearbyPaths);
                        latestTime = line.timeFinished;
                    }
                }
            });
            return possiblePaths;
        }

        //takes in an array of path, and returns the border information that surrounds the path
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
                bottomRight : s.createVector(bottomRight.x-centerOffset.x, bottomRight.y+centerOffset.y)
            };
        }

        //takes in the array of path, and the border surrounding it, and returns an array of 1 and 0 to parse into model
        //also note, this function was created when i was still using a 1D array as the features, so it returns a 1D array, instead of the 3D array
        //it gets resized by the tensorflow function though so ehhh couldnt be bothered to rewrite it 
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
                        let gradient = Math.abs( Math.atan( (resizedLines[i].y-resizedLines[i+1].y)/(resizedLines[i].x-resizedLines[i+1].x) ) );
                        if (gradient > Math.PI) { gradient = 2*Math.PI - gradient; }
                        let xDir = Math.sign(resizedLines[i].x-resizedLines[i+1].x);
                        let yDir = Math.sign(resizedLines[i].y-resizedLines[i+1].y);
                        
                        for (let j = 0;j < repeatTimes;j++)
                        {                               
                            let yRise = Math.sin(gradient)*i;
                            let xRun = Math.cos(gradient)*i;
                            let indexToChange = Math.round(resizedLines[i].x-xRun*xDir + networkInputSize*resizedLines[i].y+yRise*yDir);
                            resizedArray[indexToChange] = 1
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