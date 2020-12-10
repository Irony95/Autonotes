import React from "react";

class InformationSpace extends React.Component
{
    render()
    {
        return (<div id="infoSpace">
            <h1>
                A quick Explaination
            </h1>
            <p>
                This is a drawing programme that recognises mathematical symbols. 
                To use, draw out the symbol. The programme will then try to make its best guess
                and replace the drawn symbol into the text version. Either wait for a few seconds 
                for the programme to change it, or press (c) to instantly convert the last drawn line into
                the symbol. Pressing (z) will undo the latest conversion. The match checkbox will either enable to disable the guess.
            </p>

            <p>
                The symbols the model will recognise are : <br/>
                !, (, ), +, |, ―, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, =, 𝑎, α, |, <br/>
                𝑏, β, 𝑐, cos, 𝑑, Δ, ÷, 𝑒, ∃, 𝑓, ∀, 𝑔, γ, ≥, {">"}, 𝒉, 𝑖, in, ∞, <br/>
                ∫, 𝑗, 𝑘, ℓ, λ, ≤, lim, log, {"<"}, 𝑚, mu, 𝑛, ≠, 𝑜, 𝑝, ϕ, π, ±, 𝑞, 𝑟, →, <br/>
                𝑠, σ, sin, √, Σ, 𝑡, tan, θ, ×, 𝑢, 𝑣, 𝑤, 𝑥, 𝑦, 𝑧, [, ], {"{"}, {"}"} <br/>
            </p>

            <p>
                The dataset that was used can be found at <a href="https://www.kaggle.com/xainano/handwrittenmathsymbols">Here</a>.
                Also, some code were referenced from <a href="https://www.florin-pop.com/blog/2019/04/drawing-app-built-with-p5js/">This blog</a>.                
            </p>
            <h2>
                Quick Thoughts:
            </h2>
            <p>
                The model is an CNN, that takes in the line drawn, and nearby lines/ lines that were drawn close in time, and makes a guess as to what was drawn. <br/>
                A giant problem with my method of predicting is, that i literally have no idea when a character is drawn and when the next starts.
                For example, one could try and draw an x, which takes 2 strokes, which could be intepreted as brackets.  x and )( look alike. There is also a problem with 
                symbols looking alike, like x(letter) and ×(times). <br/>
                This makes predicting the symbol really hard to do. 
                Any suggestions or criticisms pls do tell :)
                (msg me on reddit u/irony94)

            </p>
        </div>);
    }
}

export default InformationSpace;