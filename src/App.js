import React from "react";
import Whiteboard from "./components/Whiteboard";

class App extends React.Component
{
    constructor()
    {
        super();

    }
    render()
    {
        return (
            <div>
                <h1 className="test">This is a test</h1>
                <Whiteboard/>
                
            </div>
        );
    }
}

export default App;