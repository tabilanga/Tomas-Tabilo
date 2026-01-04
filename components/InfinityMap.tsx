
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Patient, GraphNode, GraphLink } from '../types';

interface InfinityMapProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

const InfinityMap: React.FC<InfinityMapProps> = ({ patients, onSelectPatient }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || patients.length === 0) return;

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    patients.forEach(p => {
      const communeId = `commune-${p.commune.toLowerCase().replace(/\s/g, '-')}`;
      if (!nodeIds.has(communeId)) {
        nodes.push({ id: communeId, label: p.commune, type: 'commune', color: '#6366f1' });
        nodeIds.add(communeId);
      }

      const referrerId = `ref-${p.referrerName.toLowerCase().replace(/\s/g, '-')}`;
      if (!nodeIds.has(referrerId)) {
        nodes.push({ id: referrerId, label: p.referrerName, type: 'referrer', color: '#10b981' });
        nodeIds.add(referrerId);
      }

      const patientNodeId = p.id;
      nodes.push({ 
        id: patientNodeId, 
        label: p.name, 
        type: 'patient', 
        photoUrl: p.photoUrl,
        color: '#f59e0b'
      });

      links.push({ source: patientNodeId, target: communeId, value: 1 });
      links.push({ source: patientNodeId, target: referrerId, value: 2, relationship: p.relationship });
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Añadir filtros para sombras y brillos
    const defs = svg.append("defs");
    
    const filter = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "150%");
    filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 3)
      .attr("result", "blur");
    filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 0)
      .attr("dy", 4)
      .attr("result", "offsetBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(180))
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collision", d3.forceCollide().radius(90));

    const link = g.append("g")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value) * 2)
      .attr("stroke-dasharray", d => d.value === 1 ? "0" : "4 4");

    const node = g.append("g")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(drag(simulation));

    node.each(function(d) {
      const el = d3.select(this);
      
      if (d.type === 'patient') {
        // Círculo de fondo/sombra
        el.append("circle")
          .attr("r", 35)
          .attr("fill", "white")
          .style("filter", "url(#drop-shadow)");

        // Anillo de color de estado/relación
        el.append("circle")
          .attr("r", 33)
          .attr("fill", "none")
          .attr("stroke", d.color || "#ccc")
          .attr("stroke-width", 2.5);

        // Clip para la foto
        el.append("clipPath")
          .attr("id", `clip-${d.id}`)
          .append("circle")
          .attr("r", 30);

        // Placeholder si no hay foto
        el.append("circle")
          .attr("r", 30)
          .attr("fill", "#f8fafc");

        el.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", ".35em")
          .attr("fill", "#e2e8f0")
          .style("font-family", "'Font Awesome 6 Free'")
          .style("font-weight", "900")
          .style("font-size", "24px")
          .text("\uf007");

        if (d.photoUrl) {
          el.append("image")
            .attr("xlink:href", d.photoUrl)
            .attr("x", -30)
            .attr("y", -30)
            .attr("width", 60)
            .attr("height", 60)
            .attr("clip-path", `url(#clip-${d.id})`)
            .on("error", function() {
              d3.select(this).remove();
            });
        }

        // Etiqueta de nombre tipo Píldora Elegante
        const labelGroup = el.append("g")
          .attr("transform", "translate(0, 48)");

        const labelText = labelGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("class", "text-[11px] font-black fill-slate-800 uppercase tracking-tight")
          .text(d.label);

        // Calcular el ancho del texto para el fondo de la píldora
        const bbox = (labelText.node() as SVGTextElement).getBBox();
        const padding = 12;
        
        labelGroup.insert("rect", "text")
          .attr("x", bbox.x - padding)
          .attr("y", bbox.y - 4)
          .attr("width", bbox.width + (padding * 2))
          .attr("height", bbox.height + 8)
          .attr("rx", 10)
          .attr("fill", "white")
          .attr("stroke", "#f1f5f9")
          .attr("stroke-width", 1)
          .style("filter", "url(#drop-shadow)");

      } else {
        // Nodos de Comuna o Referente (más pequeños y estilizados)
        const radius = d.type === 'commune' ? 22 : 20;
        
        el.append("circle")
          .attr("r", radius)
          .attr("fill", "white")
          .attr("stroke", d.color || "#ccc")
          .attr("stroke-width", 2)
          .style("filter", "url(#drop-shadow)");

        el.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", ".35em")
          .attr("fill", d.color || "#ccc")
          .style("font-family", "'Font Awesome 6 Free'")
          .style("font-weight", "900")
          .style("font-size", "12px")
          .text(d.type === 'commune' ? "\uf015" : "\uf0c0");

        el.append("text")
          .attr("dy", radius + 15)
          .attr("text-anchor", "middle")
          .attr("class", "text-[9px] font-bold fill-slate-500 uppercase tracking-widest")
          .text(d.label);
      }
    });

    node.on("click", (event, d) => {
      if (d.type === 'patient') {
        const p = patients.find(pat => pat.id === d.id);
        if (p) onSelectPatient(p);
      }
    });

    // Hover effect
    node.on("mouseenter", function() {
      d3.select(this).transition().duration(200).attr("transform", (d: any) => `translate(${d.x},${d.y}) scale(1.1)`);
    }).on("mouseleave", function() {
      d3.select(this).transition().duration(200).attr("transform", (d: any) => `translate(${d.x},${d.y}) scale(1)`);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function drag(sim: d3.Simulation<GraphNode, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) sim.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
  }, [patients, dimensions, onSelectPatient]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-50 map-grid-bg">
      {patients.length > 0 && (
        <div className="absolute top-6 left-6 z-10 flex flex-col space-y-3">
          <div className="bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm border border-slate-200/50 flex items-center space-x-3 transition-all hover:shadow-md">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Paciente</span>
          </div>
          <div className="bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm border border-slate-200/50 flex items-center space-x-3 transition-all hover:shadow-md">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Comuna</span>
          </div>
          <div className="bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm border border-slate-200/50 flex items-center space-x-3 transition-all hover:shadow-md">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Referente</span>
          </div>
        </div>
      )}
      
      {patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
          <div className="w-32 h-32 bg-white rounded-[40px] shadow-2xl flex items-center justify-center border border-slate-100 animate-float">
            <i className="fa-solid fa-circle-nodes text-5xl text-indigo-400/40"></i>
          </div>
          <div className="text-center space-y-2 px-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Red de Referencias Infinita</h2>
            <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">
              Conecta visualmente el origen de tus pacientes y descubre patrones en tu red de salud.
            </p>
          </div>
        </div>
      ) : (
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      )}
    </div>
  );
};

export default InfinityMap;
