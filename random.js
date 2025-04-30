// random.js
window.addEventListener("DOMContentLoaded", () => {
    // 1) Navigation
    document.getElementById("homeBtn")
      .addEventListener("click", () => window.location.href = "menu.html");
  
    // 2) Parameter UI
    const modelSelect = document.getElementById("modelSelect");
    const paramsDiv   = document.getElementById("params");
  
    function renderParams() {
      const m = modelSelect.value;
      let html = "";
      if (m === "erdos") {
        html = `
          <label>n: <input id="nInput" type="number" value="20" min="1"></label>
          <label>p: <input id="pInput" type="number" step="0.01" value="0.2" min="0" max="1"></label>
        `;
      } else if (m === "watts") {
        html = `
          <label>n: <input id="nInput" type="number" value="20" min="3"></label>
          <label>k: <input id="kInput" type="number" value="4" min="2"></label>
          <label>&beta;: <input id="betaInput" type="number" step="0.01" value="0.3" min="0" max="1"></label>
        `;
      } else if (m === "barabasi") {
        html = `
          <label>n: <input id="nInput" type="number" value="20" min="2"></label>
          <label>m: <input id="mInput" type="number" value="2" min="1"></label>
        `;
      }
      paramsDiv.innerHTML = html;
    }
  
    modelSelect.addEventListener("change", renderParams);
    renderParams();  // initial
  
    // 3) Generate + display
    const svg   = d3.select("#random-svg");
    const width = +svg.attr("width"), height = +svg.attr("height");
  
    document.getElementById("generateBtn").addEventListener("click", () => {
      console.clear();
      console.log("🔄 Generating random graph");
  
      const m = modelSelect.value;
      const n = +document.getElementById("nInput").value;
      let nodes = [], links = [];
  
      // build nodes & links per model
      if (m === "erdos") {
        const p = +document.getElementById("pInput").value;
        nodes = d3.range(n).map(i => ({ id: i }));
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            if (Math.random() < p) links.push({ source: i, target: j });
          }
        }
      } else if (m === "watts") {
        const k    = +document.getElementById("kInput").value;
        const beta = +document.getElementById("betaInput").value;
        nodes = d3.range(n).map(i => ({ id: i }));
        // ring lattice
        for (let i = 0; i < n; i++) {
          for (let j = 1; j <= k/2; j++) {
            links.push({ source: i, target: (i + j) % n });
          }
        }
        // rewire
        links = links.map(l => {
          if (Math.random() < beta) {
            let t;
            do { t = Math.floor(Math.random() * n); } while (t === l.source);
            return { source: l.source, target: t };
          }
          return l;
        });
      } else if (m === "barabasi") {
        const m0 = +document.getElementById("mInput").value;
        nodes = d3.range(n).map(i => ({ id: i }));
        // fully connect first m0 nodes
        for (let i = 0; i < m0; i++) {
          for (let j = i + 1; j < m0; j++) {
            links.push({ source: i, target: j });
          }
        }
        // preferential attachment
        for (let i = m0; i < n; i++) {
          const deg   = nodes.map((_, idx) =>
            links.filter(l => l.source === idx || l.target === idx).length
          );
          const total = d3.sum(deg);
          let edges   = 0;
          while (edges < m0) {
            const r = Math.random() * total;
            let acc = 0;
            for (let j = 0; j < i; j++) {
              acc += deg[j];
              if (r <= acc) {
                links.push({ source: i, target: j });
                edges++;
                break;
              }
            }
          }
        }
      }
  
      console.log("Nodes:", nodes.length, "Links:", links.length);
  
      // clear and draw
      svg.selectAll("*").remove();
  
      const sim = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(50))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width/2, height/2));
  
      const linkSel = svg.append("g")
        .selectAll("line")
        .data(links)
        .join("line")
          .attr("stroke", "#999")
          .attr("stroke-width", 1);
  
      const nodeSel = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .join("circle")
          .attr("r", 6)
          .attr("fill", d => d.id % 2 ? "#0d3b66" : "#ef233c")
          .call(d3.drag()
            .on("start", (e,d) => {
              if (!e.active) sim.alphaTarget(0.3).restart();
              d.fx = d.x; d.fy = d.y;
            })
            .on("drag", (e,d) => {
              d.fx = e.x; d.fy = e.y;
            })
            .on("end", (e,d) => {
              if (!e.active) sim.alphaTarget(0);
              d.fx = d.fy = null;
            })
          );
  
      sim.on("tick", () => {
        linkSel
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);
        nodeSel
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
      });
    });
  });
  