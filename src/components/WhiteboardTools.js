import React from "react";

class WhiteboardTools extends React.Component
{
    render()
    {
        return (<div id="sidebar">
            <ul>
                <li>
                    <label>Pen (p):</label><br/>
                    <button id="penButton">pen</button>                   
                </li>
                <li>
                    <label>Eraser (e):</label><br/>
                    <button id="eraserButton">eraser</button>                   
                </li>
                <li>
                    <label>pan (a):</label><br/>
                    <button id="panButton">pan</button>                   
                </li>
                <li>
                    <label>Match:</label><br/>
                    <input id="matchCheckbox" type="checkbox"></input>                   
                </li>
                <li>
                    <button id="swapButton" onClick={this.props.swapBoard}>About</button>               
                </li>
            </ul>
        </div>);
    }
}

export default WhiteboardTools;