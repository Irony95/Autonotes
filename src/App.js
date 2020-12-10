import React from "react";
import Whiteboard from "./components/Whiteboard";
import WhiteboardTools from "./components/WhiteboardTools";
import InformationSpace from "./components/InformationSpace";

class App extends React.Component
{
    constructor()
    {
        super();
        this.state = {
            showingBoard : true
        }
        this.swapBoards = this.swapBoards.bind(this);
    }

    swapBoards()
    {
        let button = document.getElementById("swapButton");
        if (button.innerHTML === "About")
        {
            button.innerHTML = "Board";
        }
        else
        {
            button.innerHTML = "About";
        }
        this.setState(preState => {
            return {
                showingBoard : !preState.showingBoard
            }
        });
    }

    render()
    {
        return (
            <div id="app">
                <div id="drawingApp">    
                    <WhiteboardTools swapBoard={this.swapBoards}/>                    
                    {this.state.showingBoard ? <Whiteboard/> : <InformationSpace/>}
                    
                </div>
                
            </div>
        );
    }
}

export default App;