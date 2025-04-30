// random.js

// Navigate back to menu
document.getElementById("homeBtn").addEventListener("click", () => {
    window.location.href = "menu.html";
  });
  
  // Create tooltip container
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");
  
  // UI references
  const modelSelect = document.getElementById("modelSelect");
  const paramsDiv   = document.getElementById("params");
  const generateBtn = document.getElementById("generateBtn");
  const svg         = d3.select("#random-svg");
  const width       = +svg.attr("width");
  const height      = +svg.attr("height");
  
  // Render parameter inputs based on selected model
  function renderParams() {
    let html = "";
    switch (modelSelect.value) {
      case "erdos":
        html = `
          <label>n: <input id="nInput" type="number" value="20" min="1"></label>
          <label>p: <input id="pInput" type="number" step="0.01" value="0.2" min="0" max="1"></label>
        `;
        break;
      case "watts":
        html = `
          <label>n: <input id="nInput" type="number" value="20" min="3"></label>
          <label>k: <input id="kInput" type="number" value="4" min="2"></label>
          <label>&beta;: <input id="betaInput" type="number" step="0.01" value="0.3" min="0" max="1"></label>
        `;
        break;
      case "barabasi":
        html = `
          <label>n: <input id="nInput" type="number" value="20" min="2"></label>
          <label>m: <input id="mInput" type="number" value="2" min="1"></label>
        `;
        break;
    }
    paramsDiv.innerHTML = html;
  }
  
  modelSelect.addEventListener("change", renderParams);
  renderParams();
  
  // Main generate handler
  generateBtn.addEventListener("click", () => {
    console.clear();
    console.log("🔄 Generating random graph");
  
    const model = modelSelect.value;
    const n     = +document.getElementById("nInput").value;
    let nodes = [], links = [];
  
    // Helper: create labeled nodes A, B, ..., Z, A1, B1, ...
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    nodes = d3.range(n).map(i => ({
      id: i,
      label: alpha[i % 26] + (i < 26 ? "" : Math.floor(i / 26))
    }));
  
    // Build edges
    if (model === "erdos") {
      const p = +document.getElementById("pInput").value;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (Math.random() < p) links.push({ source: i, target: j });
        }
      }
    } else if (model === "watts") {
      const k    = +document.getElementById("kInput").value;
      const beta = +document.getElementById("betaInput").value;
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
          do { t = Math.floor(Math.random() * n); }
          while (t === l.source);
          return { source: l.source, target: t };
        }
        return l;
      });
    } else if (model === "barabasi") {
      const m0 = +document.getElementById("mInput").value;
      // fully connect initial m0 nodes
      for (let i = 0; i < m0; i++) {
        for (let j = i + 1; j < m0; j++) {
          links.push({ source: i, target: j });
        }
      }
      // preferential attachment
      for (let i = m0; i < n; i++) {
        const degree = nodes.map((_, idx) =>
          links.filter(l => l.source === idx || l.target === idx).length
        );
        const total = d3.sum(degree);
        let count = 0;
        while (count < m0) {
          const r = Math.random() * total;
          let acc = 0;
          for (let j = 0; j < i; j++) {
            acc += degree[j];
            if (r <= acc) {
              links.push({ source: i, target: j });
              count++;
              break;
            }
          }
        }
      }
    }
  
    console.log(`Built ${nodes.length} nodes, ${links.length} links`);
  
    // Build adjacency for metrics
    const adj = {};
    nodes.forEach(n => adj[n.id] = []);
    links.forEach(l => {
      adj[l.source].push(l.target);
      adj[l.target].push(l.source);
    });
  
    // Degree centrality
    const degree = {};
    for (let id in adj) degree[id] = adj[id].length;
  
    // Closeness centrality
    const closeness = {};
    nodes.forEach(n => {
      const dist = {};
      nodes.forEach(m => dist[m.id] = Infinity);
      dist[n.id] = 0;
      const Q = [n.id];
      for (let qi = 0; qi < Q.length; qi++) {
        const v = Q[qi];
        adj[v].forEach(w => {
          if (dist[w] === Infinity) {
            dist[w] = dist[v] + 1;
            Q.push(w);
          }
        });
      }
      const sum = d3.sum(Object.values(dist));
      closeness[n.id] = sum > 0 ? (nodes.length - 1) / sum : 0;
    });
  
    // Betweenness centrality (Brandes)
    const betweenness = {};
    nodes.forEach(n => betweenness[n.id] = 0);
    nodes.forEach(s => {
      const S = [], P = {}, sigma = {}, dist = {};
      nodes.forEach(w => { P[w.id] = []; sigma[w.id] = 0; dist[w.id] = -1; });
      sigma[s.id] = 1; dist[s.id] = 0;
      const Q = [s.id];
      for (let qi = 0; qi < Q.length; qi++) {
        const v = Q[qi];
        S.push(v);
        adj[v].forEach(w => {
          if (dist[w] < 0) {
            dist[w] = dist[v] + 1;
            Q.push(w);
          }
          if (dist[w] === dist[v] + 1) {
            sigma[w] += sigma[v];
            P[w].push(v);
          }
        });
      }
      const delta = {};
      nodes.forEach(w => delta[w.id] = 0);
      while (S.length) {
        const w = S.pop();
        P[w].forEach(v => {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        });
        if (w !== s.id) betweenness[w] += delta[w];
      }
    });
  
    // Clear previous drawing
    svg.selectAll("*").remove();
  
    // Force simulation
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2));
  
    // Draw links
    const linkSel = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
        .attr("stroke", "#999")
        .attr("stroke-width", 1);
  
    // Draw nodes as groups
    const nodeGroup = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
        .call(d3.drag()
          .on("start", (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x; d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = d.fy = null;
          })
        );
  
    nodeGroup.append("circle")
      .attr("r", 8)
      .attr("fill", d => d.id % 2 ? "#0d3b66" : "#da7b1d");
  
    nodeGroup.append("text")
      .text(d => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .style("font-size", "10px");
  
    // Tooltip behavior
    nodeGroup
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`
            Node ${d.label}<br/>
            Degree: ${degree[d.id]}<br/>
            Closeness: ${closeness[d.id].toFixed(2)}<br/>
            Betweenness: ${betweenness[d.id].toFixed(2)}
          `)
          .style("left", `${event.pageX + 5}px`)
          .style("top",  `${event.pageY + 5}px`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });
  
    // Tick updates
    sim.on("tick", () => {
      linkSel
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
  
      nodeGroup
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });
  });
  