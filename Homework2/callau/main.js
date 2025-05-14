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

        //Clear pre-existing charts
        d3.select("#line-chart").select("svg").remove();
        const svg = d3.select("#line-chart")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        //Check legendary filter
        const filtered = excludeLegendary ? data.filter(d => d.isLegendary !== "True") : data;

        //Group by generations
        const grouped = d3.groups(filtered, d => d.Generation).map(([gen, pokes]) => {
            const sorted = [...pokes].sort((a, b) => d3.descending(a[selectedStat], b[selectedStat]));
            let subset, label = null;

            //When highest is selected, show who are the top pokemon
            //Else calculate the average for the selected stat
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

        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));
        g.append("g").call(d3.axisLeft(y));

        //Chart and Axes labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height - 5)
            .attr("text-anchor", "middle")
            .text("Generation");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .text(`Avg ${selectedStat}`);

        //Draw trend line
        const line = d3.line()
            .x(d => x(d.generation))
            .y(d => y(d.avg));

        g.append("path")
            .datum(grouped)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2.5)
            .attr("d", line);

        //Dots + hover event to show tooltip
        const dots = g.selectAll("circle")
            .data(grouped)
            .join("circle")
            .attr("cx", d => x(d.generation))
            .attr("cy", d => y(d.avg))
            .attr("r", 4)
            .attr("fill", "darkorange")
            .on("mouseover", function (event, d) {
                const tooltip = d3.select("#tooltip");
                let text = `Gen ${d.generation}: ${selectedStat} = ${Math.round(d.avg)}`;
                if (d.label) text += `\nTop Pokémon: ${d.label}`;
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .style("display", "block")
                    .text(text);
            })
            .on("mouseout", () => d3.select("#tooltip").style("display", "none"));
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
              .attr("height", height)
              .append("g")
              .attr("transform", `translate(${width / 2},${height / 2})`);

          const chord = d3.chord()
              .padAngle(0.05)
              .sortSubgroups(d3.descending)(matrix);

          const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
          const ribbon = d3.ribbon().radius(innerRadius);
          
          // Use type-based color mapping
          const color = d => typeColors[types[d]] || d3.schemeCategory10[d % 10];

          //Outer area showing the diff types
          svg.append("g")
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
          svg.append("g")
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
          svg.append("g")
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

        //Setting dimensions
        const chartContainer = document.querySelector("#radar-chart");
        const containerRect = chartContainer.getBoundingClientRect();
        const width = containerRect.width, height = containerRect.height;
        const radius = Math.min(width, height) / 2 - 60;

        //Remove pre-existing charts
        d3.select("#radar-chart").select("svg").remove();

        //Making the chart
        const svg = d3.select("#radar-chart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        const angleSlice = (2 * Math.PI) / statKeys.length;
        
        //Find the maximum stat value for scaling
        const maxValue = d3.max(data, d => d3.max(statKeys, k => +d[k]));
        
        const rScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0, radius]);

        // raw circles for reference
        const levels = 5;
        const circles = svg.selectAll(".circle")
            .data(d3.range(1, levels + 1).reverse())
            .enter()
            .append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", d => radius * d / levels)
            .attr("fill", "none")
            .attr("stroke", "#ccc")
            .attr("stroke-dasharray", "4 4");

        //Add reference labels
        svg.selectAll(".level-label")
            .data(d3.range(1, levels + 1).reverse())
            .enter()
            .append("text")
            .attr("class", "level-label")
            .attr("x", 5)
            .attr("y", d => -radius * d / levels)
            .attr("font-size", "9px")
            .attr("fill", "#999")
            .text(d => Math.round(maxValue * d / levels));

        //Draw axis
        const axes = svg.selectAll(".axis")
            .data(statKeys)
            .enter()
            .append("g")
            .attr("class", "axis");

        axes.append("line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", (d, i) => radius * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y2", (d, i) => radius * Math.sin(angleSlice * i - Math.PI / 2))
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1);

        axes.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", (d, i) => (radius + 20) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y", (d, i) => (radius + 20) * Math.sin(angleSlice * i - Math.PI / 2))
            .text(d => d)
            .attr("font-size", "11px")
            .attr("font-weight", "bold");


        //Helper to get points for the radar chart
        function getPoints(pokemon) {
            return statKeys.map((k, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                const r = rScale(pokemon[k]);
                return [Math.cos(angle) * r, Math.sin(angle) * r];
            });
        }

        const pokemon1 = data.find(d => d.Name === pokemon1Name);
        const pokemon2 = data.find(d => d.Name === pokemon2Name);

        if (!pokemon1 || !pokemon2) return;

        const pokemons = [pokemon1, pokemon2];
        
        //Use type-based colors
        const pokemonColors = pokemons.map(p => typeColors[p.Type_1] || (p.index === 0 ? "steelblue" : "darkorange"));

        //Draw radar charts 
        pokemons.forEach((p, i) => {
            const points = getPoints(p);
            const lineGenerator = d3.lineRadial()
                .angle((d, i) => angleSlice * i)
                .radius(d => d)
                .curve(d3.curveLinearClosed);
              
            //Transform points to a format the radial line generator can use
            const radialPoints = statKeys.map((k, j) => {
                return rScale(p[k]);
            });
            
            svg.append("path")
                .attr("d", lineGenerator(radialPoints))
                .attr("fill", pokemonColors[i])
                .attr("fill-opacity", 0.4)
                .attr("stroke", pokemonColors[i])
                .attr("stroke-width", 2);
        });

        //Add dots to highlight values
        pokemons.forEach((p, i) => {
            const points = getPoints(p);
            svg.selectAll(`.dots-${i}`)
                .data(points)
                .enter()
                .append("circle")
                .attr("cx", d => d[0])
                .attr("cy", d => d[1])
                .attr("r", 4)
                .attr("fill", pokemonColors[i]);
        });

        //Add legend
        const legend = svg.append("g")
            .attr("transform", `translate(${-width / 2 + 20},${-height / 2 + 20})`);

        legend.selectAll("rect")
            .data(pokemons)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * 20)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", (d, i) => pokemonColors[i]);

        legend.selectAll("text")
            .data(pokemons)
            .enter()
            .append("text")
            .attr("x", 18)
            .attr("y", (d, i) => i * 20 + 10)
            .attr("font-size", "12px")
            .text(d => `${d.Name} (${d.Type_1}${d.Type_2 ? '/' + d.Type_2 : ''})`);
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