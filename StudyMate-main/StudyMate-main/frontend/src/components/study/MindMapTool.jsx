import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, { 
    Background, 
    Controls, 
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    MarkerType,
    useReactFlow,
    ReactFlowProvider,
    getNodesBounds,
    getViewportForBounds
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { documentService } from '../../services/documentService';


const MindMapNode = ({ data, id }) => {
    const isRoot = data.level === 0;
    const hasChildren = data.totalChildren > 0;
    const isExpanded = data.isExpanded;
    const isFaded = data.isFaded;

    const getNodeStyle = (lvl) => {
        
        const isDarkMode = !document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDarkMode ? '#ffffff' : '#0f172a';
        const secondaryTextColor = isDarkMode ? '#c4b5fd' : '#4f46e5';
        const tertiaryTextColor = isDarkMode ? '#93c5fd' : '#3b82f6';
        
        switch(lvl) {
            case 0: return {
                bg: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                border: '2px solid rgba(139, 92, 246, 0.6)',
                shadow: '0 0 30px rgba(124, 58, 237, 0.4), 0 0 60px rgba(59, 130, 246, 0.2)',
                text: textColor,
                minWidth: '200px',
                fontSize: '16px',
                padding: '16px 24px',
            };
            case 1: return {
                bg: 'linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(124, 58, 237, 0.15) 100%)',
                border: '1.5px solid rgba(139, 92, 246, 0.4)',
                shadow: '0 4px 20px rgba(124, 58, 237, 0.15)',
                text: secondaryTextColor,
                minWidth: '160px',
                fontSize: '14px',
                padding: '12px 18px',
            };
            case 2: return {
                bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                border: '1.5px solid rgba(96, 165, 250, 0.35)',
                shadow: '0 4px 16px rgba(59, 130, 246, 0.1)',
                text: tertiaryTextColor,
                minWidth: '140px',
                fontSize: '13px',
                padding: '10px 16px',
            };
            default: return {
                bg: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                shadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
                text: isDarkMode ? '#d1d5db' : '#475569',
                minWidth: '120px',
                fontSize: '12px',
                padding: '8px 14px',
            };
        }
    };

    const style = getNodeStyle(data.level);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: isFaded ? 0.35 : 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="mindmap-node-wrapper"
            onClick={(e) => {
                e.stopPropagation();
                if (data.onNodeClick) data.onNodeClick(id, data);
            }}
            style={{
                background: style.bg,
                border: style.border,
                boxShadow: data.selected 
                    ? `${style.shadow}, 0 0 0 3px rgba(139, 92, 246, 0.5)` 
                    : style.shadow,
                borderRadius: isRoot ? '16px' : '12px',
                minWidth: style.minWidth,
                maxWidth: isRoot ? '280px' : '240px',
                padding: style.padding,
                textAlign: 'center',
                cursor: 'pointer',
                position: 'relative',
            }}
        >
            {!isRoot && (
                <Handle 
                    type="target" 
                    position={Position.Top} 
                    style={{
                        width: '8px', height: '8px',
                        background: 'rgba(139, 92, 246, 0.5)',
                        border: '2px solid rgba(139, 92, 246, 0.3)',
                    }}
                />
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{
                    fontSize: style.fontSize,
                    fontWeight: isRoot ? '800' : '600',
                    lineHeight: '1.3',
                    color: style.text,
                    userSelect: 'none',
                    letterSpacing: isRoot ? '-0.02em' : 'normal',
                    wordBreak: 'break-word',
                }}>
                    {data.label}
                </span>
            </div>

            {hasChildren && (
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onToggle(data.originalId);
                    }}
                    className="mindmap-toggle-btn"
                    style={{
                        position: 'absolute',
                        bottom: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 10,
                        background: isExpanded 
                            ? 'linear-gradient(135deg, #374151, #1f2937)' 
                            : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        border: isExpanded 
                            ? '2px solid rgba(255,255,255,0.2)' 
                            : '2px solid rgba(139, 92, 246, 0.6)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: '700', lineHeight: 1 }}>
                        {isExpanded ? '−' : '+'}
                    </span>
                </div>
            )}
            
            {hasChildren && isExpanded && (
                <Handle 
                    type="source" 
                    position={Position.Bottom} 
                    style={{
                        width: '8px', height: '8px',
                        background: 'rgba(139, 92, 246, 0.5)',
                        border: '2px solid rgba(139, 92, 246, 0.3)',
                        bottom: '-16px',
                    }}
                />
            )}
        </motion.div>
    );
};

const nodeTypes = {
    mindmap: MindMapNode,
};

// ─── STABLE MANUAL LAYOUT ─────────────────────────────────────────────────────
const calculateManualLayout = (nodes, edges) => {
    const spacingX = 320;
    const spacingY = 180;
    
    const levels = {};
    nodes.forEach(node => {
        const lvl = node.data.level;
        if (!levels[lvl]) levels[lvl] = [];
        levels[lvl].push(node);
    });

    Object.keys(levels).forEach(lvl => {
        const nodesAtLevel = levels[lvl];
        const totalWidth = (nodesAtLevel.length - 1) * spacingX;
        nodesAtLevel.forEach((node, index) => {
            node.position = {
                x: (index * spacingX) - (totalWidth / 2),
                y: lvl * spacingY
            };
        });
    });

    return { nodes, edges };
};


const MindMapContent = ({ documentId, spaceId, documentIds, onContentGenerated, preloadedData, isFullScreen, onToggleFullScreen }) => {
    const reactFlowInstance = useReactFlow();
    const { fitView, setCenter, getNodes } = reactFlowInstance;
    const [loading, setLoading] = useState(false);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [rawHierarchy, setRawHierarchy] = useState(null);
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());
    const [activeNodeId, setActiveNodeId] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const hasFetched = useRef(false);
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const reactFlowWrapper = useRef(null);

    const processHierarchy = useCallback((data) => {
        const flatNodes = [];
        const flatEdges = [];
        let idCounter = 0;

        const traverse = (item, parentId = null, level = 0) => {
            const currentId = `node-${idCounter++}`;
            const nodeData = {
                id: currentId,
                title: item.title,
                children: item.children || [],
                level: level,
                parentId: parentId
            };
            flatNodes.push(nodeData);
            if (parentId) {
                flatEdges.push({ source: parentId, target: currentId });
            }
            nodeData.children.forEach(child => {
                traverse(child, currentId, level + 1);
            });
        };

        if (data) traverse(data);
        return { flatNodes, flatEdges };
    }, []);

    const toggleNode = useCallback((nodeId) => {
        setCollapsedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
    }, []);

    
    const getSubtreeIds = useCallback((nodeId, flatEdges) => {
        const ids = new Set([nodeId]);
        const queue = [nodeId];
        while (queue.length > 0) {
            const current = queue.shift();
            flatEdges.filter(e => e.source === current).forEach(e => {
                if (!ids.has(e.target)) {
                    ids.add(e.target);
                    queue.push(e.target);
                }
            });
        }
        return ids;
    }, []);

    
    const getAncestorIds = useCallback((nodeId, flatNodes) => {
        const ids = new Set();
        let current = flatNodes.find(n => n.id === nodeId);
        while (current && current.parentId) {
            ids.add(current.parentId);
            current = flatNodes.find(n => n.id === current.parentId);
        }
        return ids;
    }, []);

    
    const handleNodeClick = useCallback((nodeId, nodeData) => {
        setActiveNodeId(prev => prev === nodeId ? null : nodeId);

        
        const currentNodes = getNodes();
        const clickedNode = currentNodes.find(n => n.id === nodeId);
        if (clickedNode) {
            const nodeWidth = 200;
            const nodeHeight = 60;
            setCenter(
                clickedNode.position.x + nodeWidth / 2,
                clickedNode.position.y + nodeHeight / 2,
                { zoom: 1.2, duration: 800 }
            );
        }
    }, [getNodes, setCenter]);

    useEffect(() => {
        if (!rawHierarchy) return;

        const { flatNodes, flatEdges } = rawHierarchy;
        const visibleNodeIds = new Set();
        const rootId = flatNodes[0]?.id;

        const addVisible = (nodeId) => {
            visibleNodeIds.add(nodeId);
            if (collapsedNodes.has(nodeId)) return;
            const children = flatEdges.filter(e => e.source === nodeId).map(e => e.target);
            children.forEach(addVisible);
        };

        if (rootId) addVisible(rootId);

        
        let highlightedIds = null;
        if (activeNodeId && visibleNodeIds.has(activeNodeId)) {
            const subtreeIds = getSubtreeIds(activeNodeId, flatEdges);
            const ancestorIds = getAncestorIds(activeNodeId, flatNodes);
            highlightedIds = new Set([...subtreeIds, ...ancestorIds]);
        }

        const activeNodes = flatNodes
            .filter(n => visibleNodeIds.has(n.id))
            .map(n => ({
                id: n.id,
                type: 'mindmap',
                data: { 
                    label: n.title, 
                    level: n.level,
                    totalChildren: flatEdges.filter(e => e.source === n.id).length,
                    isExpanded: !collapsedNodes.has(n.id),
                    originalId: n.id,
                    onToggle: toggleNode,
                    onNodeClick: handleNodeClick,
                    isFaded: highlightedIds ? !highlightedIds.has(n.id) : false,
                    selected: activeNodeId === n.id,
                },
                position: { x: 0, y: 0 }
            }));

        const activeEdges = flatEdges
            .filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
            .map(e => {
                const isHighlighted = highlightedIds 
                    ? highlightedIds.has(e.source) && highlightedIds.has(e.target)
                    : true;
                return {
                    id: `e-${e.source}-${e.target}`,
                    source: e.source,
                    target: e.target,
                    type: 'bezier',
                    animated: true,
                    style: { 
                        stroke: isHighlighted 
                            ? 'rgba(139, 92, 246, 0.45)' 
                            : 'rgba(139, 92, 246, 0.1)', 
                        strokeWidth: isHighlighted ? 2.5 : 1.5,
                        transition: 'stroke 0.4s ease, stroke-width 0.4s ease',
                    },
                    markerEnd: { 
                        type: MarkerType.ArrowClosed, 
                        color: isHighlighted 
                            ? 'rgba(139, 92, 246, 0.5)' 
                            : 'rgba(139, 92, 246, 0.15)' 
                    }
                };
            });

        const { nodes: layoutedNodes, edges: layoutedEdges } = calculateManualLayout(activeNodes, activeEdges);
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
        
        setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 50);
    }, [rawHierarchy, collapsedNodes, activeNodeId, toggleNode, handleNodeClick, getSubtreeIds, getAncestorIds, setNodes, setEdges, fitView]);

    const fetchData = async () => {
        if (loading) return;
        setLoading(true);
        setActiveNodeId(null);
        try {
            const docId = documentId || (documentIds && documentIds.length > 0 ? documentIds[0] : null);
            const data = await documentService.generateMindMap(docId, { spaceId, documentIds });
            const hierarchy = processHierarchy(data.mind_map);
            const initialCollapsed = new Set();
            hierarchy.flatNodes.forEach(n => {
                if (n.level >= 1 && n.children.length > 0) initialCollapsed.add(n.id);
            });
            setCollapsedNodes(initialCollapsed);
            setRawHierarchy(hierarchy);
            if (onContentGenerated) onContentGenerated();
        } catch (error) {
            console.error('Failed to fetch mind map:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (preloadedData && !rawHierarchy) {
            const h = processHierarchy(preloadedData);
            setRawHierarchy(h);
            const initialCollapsed = new Set();
            h.flatNodes.forEach(n => {
                if (n.level >= 1 && n.children.length > 0) initialCollapsed.add(n.id);
            });
            setCollapsedNodes(initialCollapsed);
            return;
        }
        if (!hasFetched.current && !preloadedData) {
            hasFetched.current = true;
            fetchData();
        }
    }, [preloadedData]);

    
    const handleExport = useCallback(async () => {
        if (isExporting) return;
        setIsExporting(true);

        try {
            const { toPng } = await import('html-to-image');
            const currentNodes = getNodes();
            if (currentNodes.length === 0) {
                alert('No mind map to export.');
                setIsExporting(false);
                return;
            }

            const nodesBounds = getNodesBounds(currentNodes);
            const EXPORT_PADDING = 80;
            const imageWidth = (nodesBounds.width + EXPORT_PADDING * 2) * 2;
            const imageHeight = (nodesBounds.height + EXPORT_PADDING * 2) * 2;

            const viewportForBounds = getViewportForBounds(
                nodesBounds,
                imageWidth,
                imageHeight,
                0.1,
                2
            );

            const viewport = document.querySelector('.react-flow__viewport');
            if (!viewport) {
                alert('Export failed. Could not find viewport.');
                setIsExporting(false);
                return;
            }

            const dataUrl = await toPng(viewport, {
                backgroundColor: '#0a0a0c',
                width: imageWidth,
                height: imageHeight,
                pixelRatio: 2,
                style: {
                    width: `${imageWidth}px`,
                    height: `${imageHeight}px`,
                    transform: `translate(${viewportForBounds.x}px, ${viewportForBounds.y}px) scale(${viewportForBounds.zoom})`,
                },
            });

            const link = document.createElement('a');
            link.download = `studymate-mindmap-${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    }, [getNodes, isExporting]);

    
    const handleFloatingUpload = useCallback(async (e) => {
        const files = Array.from(e.target.files || []);
        const pdfFiles = files.filter(f => f.type === 'application/pdf');
        if (pdfFiles.length === 0) {
            alert('Please upload PDF files only.');
            return;
        }
        setIsUploading(true);
        try {
            for (const file of pdfFiles) {
                await documentService.upload(file, spaceId);
            }
            fetchData();
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [spaceId]);

    
    const handlePaneClick = useCallback(() => {
        setActiveNodeId(null);
    }, []);

    const Icons = {
        Export: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        ),
        Refresh: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
        ),
        Focus: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m16 12-4-4-4 4" /><path d="m12 8v8" /></svg>
        ),
        Fullscreen: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
        ),
        ExitFullscreen: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
        ),
    };

    return (
        <div 
            ref={reactFlowWrapper}
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                background: 'var(--bg-base)',
                position: 'relative',
            }}
        >
            {/* Top toolbar */}
            <div style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(12px)',
                zIndex: 10,
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {nodes.length > 0 && (
                        <span style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            fontWeight: '500',
                        }}>
                            {nodes.length} nodes
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                        onClick={() => fitView({ padding: 0.3, duration: 600 })} 
                        className="btn-secondary" 
                        style={{ height: '32px', padding: '0 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        title="Center view"
                    >
                        <Icons.Focus />
                    </button>
                    {!preloadedData && (
                        <button 
                            onClick={fetchData} 
                            disabled={loading} 
                            className="btn-secondary" 
                            style={{ height: '32px', padding: '0 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            title="Regenerate"
                        >
                            <Icons.Refresh />
                        </button>
                    )}
                    {onToggleFullScreen && (
                        <button 
                            onClick={onToggleFullScreen} 
                            className="btn-secondary" 
                            style={{ height: '32px', padding: '0 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullScreen ? <Icons.ExitFullscreen /> : <Icons.Fullscreen />}
                        </button>
                    )}
                    <button 
                        onClick={handleExport} 
                        disabled={isExporting}
                        className="btn-primary" 
                        style={{ 
                            height: '32px', padding: '0 16px', fontSize: '11px', fontWeight: '700', 
                            borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                            opacity: isExporting ? 0.6 : 1,
                            cursor: isExporting ? 'wait' : 'pointer',
                        }}
                    >
                        {isExporting ? (
                            <>
                                <div style={{
                                    width: '14px', height: '14px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: 'white',
                                    borderRadius: '50%',
                                    animation: 'mindmap-spin 1s linear infinite',
                                }} />
                                Exporting…
                            </>
                        ) : (
                            <><Icons.Export />Export PNG</>
                        )}
                    </button>
                </div>
            </div>

            {}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 20,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                    }}>
                        <div style={{
                            width: '48px', height: '48px',
                            border: '4px solid var(--accent-subtle)',
                            borderTopColor: 'var(--accent)',
                            borderRadius: '50%',
                            animation: 'mindmap-spin 1s linear infinite',
                        }} />
                        <p style={{ marginTop: '16px', color: 'var(--accent)', fontSize: '14px', fontWeight: '600' }}>
                            Generating mind map…
                        </p>
                        <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            AI is analyzing your documents
                        </p>
                    </div>
                ) : nodes.length === 0 ? (
                    <div style={{
                        height: '100%', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '16px',
                    }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'var(--accent-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <line x1="12" y1="3" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="21" />
                                <line x1="3" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="21" y2="12" />
                                <line x1="5.64" y1="5.64" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="18.36" y2="18.36" />
                                <line x1="5.64" y1="18.36" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="18.36" y2="5.64" />
                            </svg>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontWeight: '500' }}>
                            No mind map generated yet
                        </p>
                        <button 
                            onClick={fetchData} 
                            className="btn-primary" 
                            style={{ height: '42px', padding: '0 24px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}
                        >
                            Generate Mind Map
                        </button>
                    </div>
                ) : (
                    <ReactFlow 
                        nodes={nodes} 
                        edges={edges} 
                        onNodesChange={onNodesChange} 
                        onEdgesChange={onEdgesChange} 
                        nodeTypes={nodeTypes} 
                        colorMode="dark" 
                        fitView
                        fitViewOptions={{ padding: 0.3 }}
                        minZoom={0.1}
                        maxZoom={2}
                        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                        proOptions={{ hideAttribution: true }}
                        onPaneClick={handlePaneClick}
                    >
                        <Background 
                            color="rgba(139, 92, 246, 0.08)" 
                            gap={20} 
                            size={1.5} 
                            variant="dots" 
                        />
                        <Controls 
                            showInteractive={false}
                            style={{
                                background: 'var(--bg-elevated)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                overflow: 'hidden',
                            }}
                        />
                        <MiniMap 
                            nodeStrokeColor="var(--accent)" 
                            nodeColor="var(--bg-elevated)" 
                            maskColor="rgba(0,0,0,0.8)" 
                            style={{ 
                                background: 'var(--bg-base)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                            }} 
                        />
                    </ReactFlow>
                )}
            </div>

            {}
            {!preloadedData && spaceId && (
                <>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFloatingUpload}
                        style={{ display: 'none' }}
                        accept=".pdf"
                        multiple
                    />
                </>
            )}

            {/* Scoped styles for animations, hover effects, and node transitions */}
            <style>{`
                @keyframes mindmap-spin { to { transform: rotate(360deg); } }

                /* ── Smooth node position animation on expand/collapse ── */
                .react-flow__node {
                    transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }

                /* ── Node hover glow ── */
                .mindmap-node-wrapper {
                    transition: box-shadow 0.3s ease, transform 0.25s ease !important;
                }
                .react-flow__node:hover .mindmap-node-wrapper {
                    transform: scale(1.06) !important;
                    box-shadow: 
                        0 0 20px rgba(139, 92, 246, 0.5),
                        0 0 40px rgba(139, 92, 246, 0.15),
                        0 8px 32px rgba(0, 0, 0, 0.3) !important;
                }

                /* ── Toggle button hover ── */
                .mindmap-toggle-btn:hover {
                    transform: translateX(-50%) scale(1.2) !important;
                    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.5) !important;
                }

                /* ── Edge transition ── */
                .react-flow__edge path {
                    transition: stroke 0.4s ease, stroke-width 0.4s ease !important;
                }

                /* ── Controls styling ── */
                .react-flow__controls button {
                    background: rgba(15, 23, 42, 0.95) !important;
                    border: none !important;
                    border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                    color: rgba(255,255,255,0.6) !important;
                    width: 28px !important;
                    height: 28px !important;
                    transition: all 0.2s ease !important;
                }
                .react-flow__controls button:hover {
                    background: rgba(124, 58, 237, 0.3) !important;
                    color: #fff !important;
                }
                .react-flow__controls button svg {
                    fill: currentColor !important;
                }

            `}</style>
        </div>
    );
};

const MindMapTool = ({ isFullScreen, onToggleFullScreen, ...props }) => {
    const containerClass = isFullScreen
        ? "fixed inset-0 z-[100] bg-[#0a0a0c] flex flex-col"
        : "card-glass p-0 flex flex-col relative border-white/5 overflow-hidden";
    
    const containerStyle = isFullScreen 
        ? { width: '100vw', height: '100vh' }
        : { height: '100%', minHeight: '600px' };

    return (
        <div className={containerClass} style={containerStyle}>
            <ReactFlowProvider>
                <MindMapContent 
                    {...props} 
                    isFullScreen={isFullScreen} 
                    onToggleFullScreen={onToggleFullScreen} 
                />
            </ReactFlowProvider>
        </div>
    );
};

export default MindMapTool;
