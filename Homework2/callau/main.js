/*
Design Rationale:
I wanted a tool that could prove or disprove some ideas I've heard thrown around, such as
newer Pokémon powercreeping older ones. Therefore, I wanted to see if there were any noticeable
trends in statistical distributions over time. I visualized this through a line chart, which measured
this using the average stats of a generation, as well as a star chart, which compared two Pokémon
directly. I included different percentiles and stat views because I wanted to see 
whether it was a broader trend or more concentrated in Pokémon people view as viable. For the 
chord diagram, I thought it would be interesting to look at it for building teams with better
coverage. Let's say I need three different types: Water, Ground, and Electric. I can see using
the chord diagram that I am more likely to be able to find a Water/Ground than I am finding
any other type combination. Therefore, I can use the best Electric type to serve a niche 
rather than one for coverage, and I can determine which one is the best via comparison in the star
chart.
*/

//Load CSV
d3.csv("pokemon_alopez247.csv").then(data => {
    //Convert numeric strings to nums
    data.forEach(d => {
        d.Total = +d.Total;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d.HP = +d.HP;
        d["Sp. Atk"] = +d["Sp. Atk"];
        d["Sp. Def"] = +d["Sp. Def"];
        d.Speed = +d.Speed;
        d.Generation = +d.Generation;
    });

    const statKeys = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

    //Color Map for the different types
    const typeColors = {
        "Fire": "#F08030",     // Red-orange
        "Water": "#6890F0",    // Blue
        "Grass": "#78C850",    // Green
        "Electric": "#F8D030", // Yellow
        "Ice": "#98D8D8",      // Light blue
        "Fighting": "#C03028", // Dark red
        "Poison": "#A040A0",   // Purple
        "Ground": "#E0C068",   // Brown
        "Flying": "#A890F0",   // Light purple
        "Psychic": "#F85888",  // Pink
        "Bug": "#A8B820",      // Light green
        "Rock": "#B8A038",     // Dark yellow
        "Ghost": "#705898",    // Dark purple
        "Dragon": "#7038F8",   // Dark blue-purple
        "Dark": "#705848",     // Dark brown
        "Steel": "#B8B8D0",    // Light gray
        "Fairy": "#EE99AC",    // Light pink
        "Normal": "#A8A878"    // Tan
    };

    //Default setings for Line Chart
    let selectedStat = "Total";
    let selectedPercentile = "0.1";
    let excludeLegendary = false;

    //Line Chart meant to measure the trends in stats over multiple generations
    function renderLineChart() {
        const width = 600, height = 300, margin = { top: 50, right: 30, bottom: 40, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
    
        // Check if this is the first render or an update
        let svg = d3.select("#line-chart").select("svg");
        const isFirstRender = svg.empty();
    
        if (isFirstRender) {
            svg = d3.select("#line-chart")
                .append("svg")
                .attr("width", width)
                .attr("height", height);
        }
    
        let g = svg.select("g.main-group");
        if (g.empty()) {
            g = svg.append("g")
                .attr("class", "main-group")
                .attr("transform", `translate(${margin.left},${margin.top})`);
        }
    
        //Check legendary filter
        const filtered = excludeLegendary ? data.filter(d => d.isLegendary !== "True") : data;
    
        //Group by generations
        const grouped = d3.groups(filtered, d => d.Generation).map(([gen, pokes]) => {
            const sorted = [...pokes].sort((a, b) => d3.descending(a[selectedStat], b[selectedStat]));
            let subset, label = null;
    
            if (selectedPercentile === "highest") {
                subset = [sorted[0]];
                label = sorted[0].Name;
            } else {
                const pct = parseFloat(selectedPercentile);
                subset = sorted.slice(0, Math.ceil(sorted.length * pct));
            }
    
            const avg = d3.mean(subset, d => d[selectedStat]);
            return { generation: +gen, avg, label };
        });
    
        //X Axis
        const x = d3.scaleLinear()
            .domain(d3.extent(grouped, d => d.generation))
            .range([0, innerWidth]);
    
        //Calculating buffer for Y-Axis
        const min = d3.min(grouped, d => d.avg);
        const max = d3.max(grouped, d => d.avg);
        const buffer = (max - min) * 0.1;
    
        //Y Axis
        const y = d3.scaleLinear()
            .domain([min - buffer, max + buffer])
            .range([innerHeight, 0]);
    
        // Add or update axes with transitions
        let xAxisGroup = g.select(".x-axis");
        if (xAxisGroup.empty()) {
            xAxisGroup = g.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${innerHeight})`);
        }
        xAxisGroup.transition()
            .duration(750)
            .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));
    
        let yAxisGroup = g.select(".y-axis");
        if (yAxisGroup.empty()) {
            yAxisGroup = g.append("g").attr("class", "y-axis");
        }
        yAxisGroup.transition()
            .duration(750)
            .call(d3.axisLeft(y));
    
        // Add or update labels
        let title = svg.select(".chart-title");
        if (title.empty()) {
            title = svg.append("text")
                .attr("class", "chart-title")
                .attr("x", width / 2)
                .attr("y", 20)
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .attr("font-weight", "bold");
        }
    
        let xLabel = svg.select(".x-label");
        if (xLabel.empty()) {
            xLabel = svg.append("text")
                .attr("class", "x-label")
                .attr("x", width / 2)
                .attr("y", height - 5)
                .attr("text-anchor", "middle")
                .text("Generation");
        }
    
        let yLabel = svg.select(".y-label");
        if (yLabel.empty()) {
            yLabel = svg.append("text")
                .attr("class", "y-label")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", 15)
                .attr("text-anchor", "middle");
        }
        yLabel.transition()
            .duration(300)
            .text(`Avg ${selectedStat}`);
    
        //Draw trend line with animation
        const line = d3.line()
            .x(d => x(d.generation))
            .y(d => y(d.avg));
    
        let path = g.select(".trend-line");
        if (path.empty()) {
            path = g.append("path")
                .attr("class", "trend-line")
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2.5);
            
            // Animate line drawing on first render
            const totalLength = path.node().getTotalLength();
            path.attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength)
                .datum(grouped)
                .attr("d", line)
                .transition()
                .duration(1500)
                .attr("stroke-dashoffset", 0);
        } else {
            // Smooth transition for line updates
            path.datum(grouped)
                .transition()
                .duration(750)
                .attr("d", line);
        }
    
        //Animated dots with hover events
        const dots = g.selectAll("circle.data-point")
            .data(grouped, d => d.generation);
    
        // Enter new dots
        const dotsEnter = dots.enter()
            .append("circle")
            .attr("class", "data-point")
            .attr("cx", d => x(d.generation))
            .attr("cy", d => y(d.avg))
            .attr("r", 0)
            .attr("fill", "darkorange");
    
        // Update existing dots
        dots.merge(dotsEnter)
            .on("mouseover", function (event, d) {
                // Scale up on hover
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 6);
                
                const tooltip = d3.select("#tooltip");
                let text = `Gen ${d.generation}: ${selectedStat} = ${Math.round(d.avg)}`;
                if (d.label) text += `\nTop Pokémon: ${d.label}`;
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .style("display", "block")
                    .text(text);
            })
            .on("mouseout", function() {
                // Scale back down
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 4);
                d3.select("#tooltip").style("display", "none");
            })
            .transition()
            .duration(750)
            .attr("cx", d => x(d.generation))
            .attr("cy", d => y(d.avg))
            .attr("r", 4);
    
        // Remove old dots
        dots.exit()
            .transition()
            .duration(300)
            .attr("r", 0)
            .remove();
    }
    

    //Chord Diagram meant to show type relationships
    function renderChordDiagram() {
        //List of all unique types
        const types = Array.from(new Set(data.flatMap(d => [d.Type_1, d.Type_2].filter(Boolean)))).sort();
        const typeIndex = new Map(types.map((t, i) => [t, i]));

        //Matrix with the counts of every combination
        //Pokemon with one type are counted as Type1/Type1
        const matrix = Array(types.length).fill(0).map(() => Array(types.length).fill(0));
        data.forEach(d => {
            const t1 = d.Type_1;
            const t2 = d.Type_2 || t1;
            const i = typeIndex.get(t1);
            const j = typeIndex.get(t2);
            if (i == null || j == null) return;
            matrix[i][j]++;
            if (i !== j) matrix[j][i]++;
        });

        //Clear pre-existing chart
        d3.select("#chord-diagram").select("svg").remove();

        //Setting dimensions
        const chartContainer = document.querySelector("#chord-diagram");
        const containerRect = chartContainer.getBoundingClientRect();
        const width = containerRect.width, height = containerRect.height;
        const outerRadius = Math.min(width, height) / 2 - 40;
        const innerRadius = outerRadius - 20;

        //Chord Layout
        const svg = d3.select("#chord-diagram")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        // ADD ZOOM FUNCTIONALITY HERE
        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])  // Allow zooming from 50% to 300%
            .on("zoom", (event) => {
                g.attr("transform", `translate(${width / 2},${height / 2}) ${event.transform}`);
            });

        svg.call(zoom);
        // END ZOOM ADDITION

        const g = svg.append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        const chord = d3.chord()
            .padAngle(0.05)
            .sortSubgroups(d3.descending)(matrix);

        const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
        const ribbon = d3.ribbon().radius(innerRadius);
        
        // Use type-based color mapping
        const color = d => typeColors[types[d]] || d3.schemeCategory10[d % 10];

        //Outer area showing the diff types
        g.append("g")
            .selectAll("path")
            .data(chord.groups)
            .enter()
            .append("path")
            .attr("fill", d => typeColors[types[d.index]] || d3.schemeCategory10[d.index % 10])
            .attr("stroke", "#000")
            .attr("d", arc)
            .append("title")
            .text(d => `${types[d.index]}: ${d3.sum(matrix[d.index])} appearances`);

        //Ribbons showing the combinations
        g.append("g")
            .selectAll("path")
            .data(chord)
            .enter()
            .append("path")
            .attr("fill", d => typeColors[types[d.source.index]] || d3.schemeCategory10[d.source.index % 10])
            .attr("stroke", "#000")
            .attr("d", ribbon)
            .attr("fill-opacity", 0.7)
            .append("title")
            .text(d => `${types[d.source.index]} ⇄ ${types[d.target.index]}: ${d.source.value} pairings`);

        //Labels for each type
        g.append("g")
            .selectAll("text")
            .data(chord.groups)
            .enter()
            .append("text")
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr("dy", ".35em")
            .attr("transform", d => `
                rotate(${(d.angle * 180 / Math.PI - 90)})
                translate(${outerRadius + 10})
                ${d.angle > Math.PI ? "rotate(180)" : ""}`)
            .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
            .attr("font-size", "10px")
            .attr("fill", "#333")
            .text(d => types[d.index]);
    }

      //Radar/Star Chart to compare two pokemon directly
      function renderRadarChart(pokemon1Name, pokemon2Name) {
        const chartContainer = document.querySelector("#radar-chart");
        const containerRect = chartContainer.getBoundingClientRect();
        const width = containerRect.width, height = containerRect.height;
        const radius = Math.min(width, height) / 2 - 60;
    
        // Check if this is first render or update
        let svg = d3.select("#radar-chart").select("svg");
        const isFirstRender = svg.empty();
    
        if (isFirstRender) {
            svg = d3.select("#radar-chart")
                .append("svg")
                .attr("width", width)
                .attr("height", height);
        }
    
        let g = svg.select("g.radar-main");
        if (g.empty()) {
            g = svg.append("g")
                .attr("class", "radar-main")
                .attr("transform", `translate(${width / 2},${height / 2})`);
        }
    
        const angleSlice = (2 * Math.PI) / statKeys.length;
        const maxValue = d3.max(data, d => d3.max(statKeys, k => +d[k]));
        const rScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0, radius]);
    
        // Only draw static elements on first render
        if (isFirstRender) {
            // Draw reference circles
            const levels = 5;
            g.selectAll(".circle")
                .data(d3.range(1, levels + 1).reverse())
                .enter()
                .append("circle")
                .attr("class", "circle")
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", d => radius * d / levels)
                .attr("fill", "none")
                .attr("stroke", "#ccc")
                .attr("stroke-dasharray", "4 4")
                .attr("opacity", 0)
                .transition()
                .duration(500)
                .attr("opacity", 1);
    
            // Add reference labels
            g.selectAll(".level-label")
                .data(d3.range(1, levels + 1).reverse())
                .enter()
                .append("text")
                .attr("class", "level-label")
                .attr("x", 5)
                .attr("y", d => -radius * d / levels)
                .attr("font-size", "9px")
                .attr("fill", "#999")
                .attr("opacity", 0)
                .text(d => Math.round(maxValue * d / levels))
                .transition()
                .duration(500)
                .delay(200)
                .attr("opacity", 1);
    
            // Draw axes
            const axes = g.selectAll(".axis")
                .data(statKeys)
                .enter()
                .append("g")
                .attr("class", "axis");
    
            axes.append("line")
                .attr("x1", 0).attr("y1", 0)
                .attr("x2", 0).attr("y2", 0)
                .attr("stroke", "#ccc")
                .attr("stroke-width", 1)
                .transition()
                .duration(800)
                .delay((d, i) => i * 100)
                .attr("x2", (d, i) => radius * Math.cos(angleSlice * i - Math.PI / 2))
                .attr("y2", (d, i) => radius * Math.sin(angleSlice * i - Math.PI / 2));
    
            axes.append("text")
                .attr("class", "axis-label")
                .attr("text-anchor", "middle")
                .attr("x", (d, i) => (radius + 20) * Math.cos(angleSlice * i - Math.PI / 2))
                .attr("y", (d, i) => (radius + 20) * Math.sin(angleSlice * i - Math.PI / 2))
                .text(d => d)
                .attr("font-size", "11px")
                .attr("font-weight", "bold")
                .attr("opacity", 0)
                .transition()
                .duration(500)
                .delay(800)
                .attr("opacity", 1);
        }
    
        const pokemon1 = data.find(d => d.Name === pokemon1Name);
        const pokemon2 = data.find(d => d.Name === pokemon2Name);
    
        if (!pokemon1 || !pokemon2) return;
    
        const pokemons = [pokemon1, pokemon2];
        const pokemonColors = pokemons.map(p => typeColors[p.Type_1] || (p.index === 0 ? "steelblue" : "darkorange"));
    
        // Animate radar charts
        pokemons.forEach((p, i) => {
            const radialPoints = statKeys.map(k => rScale(p[k]));
            
            const lineGenerator = d3.lineRadial()
                .angle((d, i) => angleSlice * i)
                .radius(d => d)
                .curve(d3.curveLinearClosed);
    
            let radarPath = g.select(`.radar-path-${i}`);
            if (radarPath.empty()) {
                radarPath = g.append("path")
                    .attr("class", `radar-path-${i}`)
                    .attr("fill", pokemonColors[i])
                    .attr("fill-opacity", 0.4)
                    .attr("stroke", pokemonColors[i])
                    .attr("stroke-width", 2);
                
                // Animate from center on first render
                const zeroPoints = statKeys.map(() => 0);
                radarPath.attr("d", lineGenerator(zeroPoints))
                    .transition()
                    .duration(1000)
                    .delay(i * 200)
                    .attr("d", lineGenerator(radialPoints));
            } else {
                // Smooth transition for updates
                radarPath.transition()
                    .duration(800)
                    .attr("d", lineGenerator(radialPoints))
                    .attr("fill", pokemonColors[i])
                    .attr("stroke", pokemonColors[i]);
            }
    
            // Animate dots
            const points = statKeys.map((k, j) => {
                const angle = angleSlice * j - Math.PI / 2;
                const r = rScale(p[k]);
                return [Math.cos(angle) * r, Math.sin(angle) * r];
            });
    
            const dots = g.selectAll(`.dots-${i}`)
                .data(points);
    
            const dotsEnter = dots.enter()
                .append("circle")
                .attr("class", `dots-${i}`)
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", 0)
                .attr("fill", pokemonColors[i]);
    
            dots.merge(dotsEnter)
                .transition()
                .duration(800)
                .delay(isFirstRender ? i * 200 + 1000 : 0)
                .attr("cx", d => d[0])
                .attr("cy", d => d[1])
                .attr("r", 4)
                .attr("fill", pokemonColors[i]);
    
            dots.exit()
                .transition()
                .duration(300)
                .attr("r", 0)
                .remove();
        });
    
        // Update legend with animation
        let legend = g.select(".legend");
        if (legend.empty()) {
            legend = g.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${-width / 2 + 20},${-height / 2 + 20})`);
        }
    
        const legendData = legend.selectAll(".legend-item")
            .data(pokemons);
    
        const legendEnter = legendData.enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("opacity", 0);
    
        legendEnter.append("rect")
            .attr("width", 12)
            .attr("height", 12);
    
        legendEnter.append("text")
            .attr("x", 18)
            .attr("font-size", "12px");
    
        const legendMerged = legendData.merge(legendEnter);
    
        legendMerged
            .transition()
            .duration(500)
            .attr("opacity", 1)
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);
    
        legendMerged.select("rect")
            .transition()
            .duration(500)
            .attr("fill", (d, i) => pokemonColors[i]);
    
        legendMerged.select("text")
            .transition()
            .duration(300)
            .tween("text", function(d) {
                const oldText = this.textContent;
                const newText = `${d.Name} (${d.Type_1}${d.Type_2 ? '/' + d.Type_2 : ''})`;
                const interpolate = d3.interpolateString(oldText, newText);
                return function(t) {
                    this.textContent = interpolate(t);
                };
            });
    
        legendData.exit()
            .transition()
            .duration(300)
            .attr("opacity", 0)
            .remove();
    }

    //Helper function to filter Pokemon based on search input
    function filterPokemon(searchTerm, selectElement) {
        const names = Array.from(new Set(data.map(d => d.Name))).sort();
        const filteredNames = searchTerm.length >= 1
            ? names.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
            : [];
    
        const currentSelection = selectElement.value;
    
        while (selectElement.firstChild) {
            selectElement.removeChild(selectElement.firstChild);
        }
    
        filteredNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selectElement.appendChild(option);
        });
    
        if (filteredNames.includes(currentSelection)) {
            selectElement.value = currentSelection;
        } else if (filteredNames.length > 0) {
            selectElement.value = filteredNames[0];
            updateRadarChart();
        }
    }
    

    //Event listeners
    d3.select("#stat-select").on("change", function () {
        selectedStat = this.value;
        renderLineChart();
    });

    d3.select("#percentile-select").on("change", function () {
        selectedPercentile = this.value;
        renderLineChart();
    });

    d3.select("#legendary-filter").on("change", function () {
        excludeLegendary = this.checked;
        renderLineChart();
    });

    //Pokemon search functionality
    const pokemon1Select = document.getElementById("pokemon1-select");
    const pokemon2Select = document.getElementById("pokemon2-select");
    const pokemon1Search = document.getElementById("pokemon1-search");
    const pokemon2Search = document.getElementById("pokemon2-search");

    //Handle search selection - when user selects from dropdown after search
    pokemon1Select.addEventListener("change", function() {
        updateRadarChart();
    });
    
    pokemon2Select.addEventListener("change", function() {
        updateRadarChart();
    });
    
    //Handle search enter key - applies current top selection
    pokemon1Search.addEventListener("keyup", function(event) {
        if (event.key === "Enter") {
            filterPokemon(this.value, pokemon1Select);
            updateRadarChart();
        }
    });
    
    pokemon2Search.addEventListener("keyup", function(event) {
        if (event.key === "Enter") {
            filterPokemon(this.value, pokemon2Select);
            updateRadarChart();
        }
    });

    function updateRadarChart() {
        const p1 = pokemon1Select.value;
        const p2 = pokemon2Select.value;
        renderRadarChart(p1, p2);
    }

    //Populate Pokemon selectors initially
    const names = Array.from(new Set(data.map(d => d.Name))).sort();
    
    //Populate the selects with all pokemon
    filterPokemon("", pokemon1Select);
    filterPokemon("", pokemon2Select);
    
    //Set default selections
    pokemon1Select.value = "Abomasnow";
    pokemon2Select.value = "Abomasnow";

    //Handle window resize
    function handleResize() {
        renderLineChart();
        renderChordDiagram();
        updateRadarChart();
    }

    window.addEventListener('resize', handleResize);

    //Initial render
    renderLineChart();
    renderChordDiagram();
    renderRadarChart("Abomasnow", "Abomasnow");
  });