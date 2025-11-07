'use client';

import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  MarkerType,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Mock data for team dependencies
// Note: If both A->B and B->A exist, they form a bidirectional dependency
const mockTeamDependencies = [
  {
    fromTeam: 'Backend Team',
    toTeam: 'Frontend Team',
    storyCount: 5,
  },
  {
    fromTeam: 'Frontend Team',
    toTeam: 'Backend Team',
    storyCount: 3,
  },
  {
    fromTeam: 'DevOps Team',
    toTeam: 'Backend Team',
    storyCount: 8,
  },
  {
    fromTeam: 'Backend Team',
    toTeam: 'DevOps Team',
    storyCount: 2,
  },
  {
    fromTeam: 'QA Team',
    toTeam: 'Frontend Team',
    storyCount: 4,
  },
  {
    fromTeam: 'Mobile Team',
    toTeam: 'Backend Team',
    storyCount: 6,
  },
  {
    fromTeam: 'Mobile Team',
    toTeam: 'Frontend Team',
    storyCount: 2,
  },
  {
    fromTeam: 'Data Team',
    toTeam: 'Backend Team',
    storyCount: 7,
  },
  {
    fromTeam: 'Backend Team',
    toTeam: 'Data Team',
    storyCount: 1,
  },
  {
    fromTeam: 'Security Team',
    toTeam: 'Backend Team',
    storyCount: 3,
  },
];

// Get unique teams
const uniqueTeams = Array.from(
  new Set([
    ...mockTeamDependencies.map((d) => d.fromTeam),
    ...mockTeamDependencies.map((d) => d.toTeam),
  ])
);

// Calculate node positions in a circular layout
const calculateNodePositions = (teams: string[], radius = 300) => {
  const centerX = 400;
  const centerY = 400;
  const angleStep = (2 * Math.PI) / teams.length;

  return teams.map((team, index) => {
    const angle = index * angleStep - Math.PI / 2; // Start from top
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { team, x, y };
  });
};

export default function TeamDependencyGraphPage() {
  // Create initial node positions
  const nodePositions = calculateNodePositions(uniqueTeams);

  // Initialize nodes with state
  const initialNodes: Node[] = useMemo(
    () =>
      nodePositions.map((pos, index) => ({
        id: pos.team,
        type: 'default',
        position: { x: pos.x, y: pos.y },
        draggable: true,
        selectable: true,
        data: {
          label: pos.team,
        },
        style: {
          background: '#ffffff',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '10px 15px',
          minWidth: '120px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          cursor: 'grab',
          pointerEvents: 'auto',
        },
      })),
    []
  );

  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  // Handle node changes (for dragging)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  // Create edges
  const edges: Edge[] = useMemo(() => {
    const edgeMap = new Map<string, { forward: number; reverse?: number }>();
    const processedPairs = new Set<string>();

    // First pass: collect all dependencies and detect bidirectional
    mockTeamDependencies.forEach((dep) => {
      const pairKey = [dep.fromTeam, dep.toTeam].sort().join('-');
      
      if (processedPairs.has(pairKey)) {
        return; // Already processed this pair
      }

      const key = `${dep.fromTeam}-${dep.toTeam}`;
      
      // Check if reverse dependency exists
      const reverse = mockTeamDependencies.find(
        (d) => d.fromTeam === dep.toTeam && d.toTeam === dep.fromTeam
      );

      if (reverse) {
        // Bidirectional dependency detected
        edgeMap.set(key, {
          forward: dep.storyCount,
          reverse: reverse.storyCount,
        });
        processedPairs.add(pairKey);
      } else {
        // One-way dependency
        edgeMap.set(key, { forward: dep.storyCount });
        processedPairs.add(pairKey);
      }
    });

    // Second pass: create edges
    const createdEdges: Edge[] = [];

    edgeMap.forEach((counts, key) => {
      const [fromTeam, toTeam] = key.split('-');

      if (counts.reverse !== undefined && counts.reverse > 0) {
        // Bidirectional: create two edges with offset for visibility
        // Forward edge (blue, going right/down)
        createdEdges.push({
          id: `edge-${fromTeam}-${toTeam}`,
          source: fromTeam,
          target: toTeam,
          label: `${counts.forward} stories`,
          type: 'smoothstep',
          animated: false,
          style: {
            strokeWidth: Math.min(3 + counts.forward * 0.5, 8),
            stroke: '#3b82f6',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
            width: 20,
            height: 20,
          },
          labelStyle: {
            fill: '#1e40af',
            fontWeight: 600,
            fontSize: '12px',
            background: '#ffffff',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #3b82f6',
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.95,
          },
        });

        // Reverse edge (red, going left/up)
        createdEdges.push({
          id: `edge-${toTeam}-${fromTeam}`,
          source: toTeam,
          target: fromTeam,
          label: `${counts.reverse} stories`,
          type: 'smoothstep',
          animated: false,
          style: {
            strokeWidth: Math.min(3 + counts.reverse * 0.5, 8),
            stroke: '#ef4444',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#ef4444',
            width: 20,
            height: 20,
          },
          labelStyle: {
            fill: '#991b1b',
            fontWeight: 600,
            fontSize: '12px',
            background: '#ffffff',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #ef4444',
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.95,
          },
        });
      } else {
        // One-way dependency
        createdEdges.push({
          id: `edge-${fromTeam}-${toTeam}`,
          source: fromTeam,
          target: toTeam,
          label: `${counts.forward} stories`,
          type: 'smoothstep',
          animated: false,
          style: {
            strokeWidth: Math.min(3 + counts.forward * 0.5, 8),
            stroke: '#3b82f6',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
            width: 20,
            height: 20,
          },
          labelStyle: {
            fill: '#1e40af',
            fontWeight: 600,
            fontSize: '12px',
            background: '#ffffff',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #3b82f6',
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.95,
          },
        });
      }
    });

    return createdEdges;
  }, []);

  const onInit = useCallback((reactFlowInstance: any) => {
    reactFlowInstance.fitView({ padding: 0.2 });
  }, []);

  return (
    <div className="h-full w-full bg-gray-50">
      <style jsx global>{`
        .react-flow__node {
          cursor: grab !important;
        }
        .react-flow__node:active {
          cursor: grabbing !important;
        }
        .react-flow__node-default {
          pointer-events: auto !important;
        }
        .react-flow__node-default .react-flow__handle {
          pointer-events: none;
        }
      `}</style>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Team Dependency Graph
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Visualize dependencies between teams. Arrows show dependency direction,
          numbers indicate story counts, and line thickness represents dependency
          magnitude. Click and drag nodes to reposition them.
        </p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-blue-500"></div>
            <span>One-way dependency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-red-500"></div>
            <span>Reverse dependency</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Thicker line = More dependencies</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm" style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onInit={onInit}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          panOnScroll={true}
          zoomOnScroll={true}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              return '#3b82f6';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background color="#f3f4f6" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
}

