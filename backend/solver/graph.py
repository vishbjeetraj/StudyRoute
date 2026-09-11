import logging
from typing import Dict, List, Set, Optional, Tuple

try:
    from ..models.syllabus import Topic
except (ImportError, ValueError):
    from models.syllabus import Topic

logger = logging.getLogger("studyroute.graph")


class CircularDependencyError(Exception):
    def __init__(self, cycle: List[str]):
        self.cycle = cycle
        super().__init__(f"Circular dependency detected in syllabus: {' -> '.join(cycle)}")


class TopicNode:
    def __init__(
        self,
        topic_id: str,
        name: str,
        subject: str,
        difficulty: str,
        estimated_hours: float,
        prerequisites: List[str],
        unit: Optional[str] = None,
        exam_date: Optional[str] = None,
        deadline_date: Optional[str] = None,
        completed: bool = False,
    ):
        self.id = topic_id
        self.name = name
        self.subject = subject
        self.difficulty = difficulty.lower()
        self.estimated_hours = float(estimated_hours)
        self.prerequisites = list(prerequisites)
        self.unit = unit
        self.exam_date = exam_date
        self.deadline_date = deadline_date
        self.completed = completed

    def __repr__(self) -> str:
        return f"<TopicNode {self.id}: {self.name} ({self.subject})>"


class TopicGraph:
    """
    Directed Acyclic Graph representing topic prerequisite relationships.
    Nodes = Topics
    Directed Edge (A -> B) means Topic A must be studied before Topic B.
    Includes safe cycle detection and automatic cycle resolution.
    """

    def __init__(self):
        self.nodes: Dict[str, TopicNode] = {}
        # adj[A] = set of topic IDs that depend on A (out-edges)
        self.adj: Dict[str, Set[str]] = {}
        # in_degrees[B] = number of unfulfilled prerequisites
        self.in_degrees: Dict[str, int] = {}
        # reverse_adj[B] = set of prerequisites for B (in-edges)
        self.reverse_adj: Dict[str, Set[str]] = {}
        self.cycle_resolution_warnings: List[str] = []

    def add_topic(
        self,
        topic: Topic,
        subject_name: str = "",
        exam_date: Optional[str] = None,
        deadline_date: Optional[str] = None,
    ) -> TopicNode:
        """Register a topic node in the graph."""
        node = TopicNode(
            topic_id=topic.id,
            name=topic.name,
            subject=subject_name,
            difficulty=topic.difficulty,
            estimated_hours=topic.estimated_hours,
            prerequisites=topic.prerequisites,
            unit=topic.unit,
            exam_date=exam_date,
            deadline_date=deadline_date,
            completed=topic.completed,
        )
        self.nodes[topic.id] = node
        if topic.id not in self.adj:
            self.adj[topic.id] = set()
        if topic.id not in self.reverse_adj:
            self.reverse_adj[topic.id] = set()
        if topic.id not in self.in_degrees:
            self.in_degrees[topic.id] = 0
        return node

    def add_dependency(self, prereq_id: str, dependent_id: str) -> None:
        """
        Add directed dependency edge: prereq_id -> dependent_id.
        dependent_id cannot be studied until prereq_id is complete.
        Ignores self-dependencies.
        """
        if prereq_id == dependent_id:
            return

        if prereq_id not in self.nodes or dependent_id not in self.nodes:
            return

        if dependent_id not in self.adj[prereq_id]:
            self.adj[prereq_id].add(dependent_id)
            self.reverse_adj[dependent_id].add(prereq_id)
            self.in_degrees[dependent_id] = len(self.reverse_adj[dependent_id])

    def remove_dependency(self, prereq_id: str, dependent_id: str) -> None:
        """Remove directed dependency edge: prereq_id -> dependent_id."""
        if prereq_id in self.adj and dependent_id in self.adj[prereq_id]:
            self.adj[prereq_id].remove(dependent_id)
        if dependent_id in self.reverse_adj and prereq_id in self.reverse_adj[dependent_id]:
            self.reverse_adj[dependent_id].remove(prereq_id)
        if dependent_id in self.in_degrees:
            self.in_degrees[dependent_id] = len(self.reverse_adj.get(dependent_id, set()))

    def detect_cycles(self) -> Optional[List[str]]:
        """
        Detect any cycles in the graph using DFS with a recursion stack.
        Returns the cycle chain list [A, B, C, A] if detected, else None.
        """
        visited: Set[str] = set()
        rec_stack: Set[str] = set()

        def dfs(node_id: str, path: List[str]) -> Optional[List[str]]:
            visited.add(node_id)
            rec_stack.add(node_id)
            path.append(node_id)

            for neighbor in sorted(self.adj.get(node_id, set())):
                if neighbor not in visited:
                    cycle = dfs(neighbor, path)
                    if cycle:
                        return cycle
                elif neighbor in rec_stack:
                    cycle_start_idx = path.index(neighbor)
                    return path[cycle_start_idx:] + [neighbor]

            path.pop()
            rec_stack.remove(node_id)
            return None

        for node_id in sorted(self.nodes.keys()):
            if node_id not in visited:
                cycle = dfs(node_id, [])
                if cycle:
                    return cycle
        return None

    def resolve_cycles(self) -> List[str]:
        """
        Safely resolves any cycles in the prerequisite graph by removing the
        closing inferred/back-edge. Never crashes the application or creates an
        impossible schedule. Returns human-readable warnings.
        """
        warnings = []
        max_attempts = 100
        attempts = 0

        while attempts < max_attempts:
            cycle = self.detect_cycles()
            if not cycle:
                break
            attempts += 1
            # Cycle chain: [A, B, C, A]
            u = cycle[-2]
            v = cycle[-1]
            u_name = self.nodes[u].name if u in self.nodes else u
            v_name = self.nodes[v].name if v in self.nodes else v

            self.remove_dependency(u, v)
            warn_msg = (
                f"Circular dependency detected ({' -> '.join(cycle)}). "
                f"Safely resolved by breaking prerequisite edge from '{u_name}' to '{v_name}'."
            )
            logger.warning(warn_msg)
            warnings.append(warn_msg)

        self.cycle_resolution_warnings.extend(warnings)
        return warnings

    def topological_sort(self, auto_resolve: bool = False) -> List[str]:
        """
        Deterministic Kahn's algorithm for topological sorting.
        Guarantees that all prerequisites appear before their dependents.
        If auto_resolve is True, safely breaks cycles beforehand.
        Otherwise raises CircularDependencyError if cycles are present.
        """
        if auto_resolve:
            self.resolve_cycles()
        else:
            cycle = self.detect_cycles()
            if cycle:
                raise CircularDependencyError(cycle)

        # Local copy of in-degrees
        in_degree = {k: len(self.reverse_adj.get(k, set())) for k in self.nodes}
        diff_map = {"hard": 3, "medium": 2, "easy": 1}

        def tie_breaker(node_id: str) -> Tuple:
            node = self.nodes[node_id]
            return (
                not node.completed,  # Completed first
                -diff_map.get(node.difficulty, 2),
                -node.estimated_hours,
                node_id
            )

        zero_in_degree = [node_id for node_id, deg in in_degree.items() if deg == 0]
        zero_in_degree.sort(key=tie_breaker)

        result: List[str] = []
        while zero_in_degree:
            curr = zero_in_degree.pop(0)
            result.append(curr)

            for neighbor in sorted(self.adj.get(curr, set())):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    zero_in_degree.append(neighbor)
                    zero_in_degree.sort(key=tie_breaker)

        # In the impossible event that isolated orphan cycles still exist, append them safely
        if len(result) != len(self.nodes):
            remaining = [n for n in self.nodes if n not in result]
            remaining.sort(key=tie_breaker)
            result.extend(remaining)

        return result

    def get_dependency_levels(self) -> Dict[str, int]:
        """
        Compute the topological level for each node.
        Level 0: No prerequisites.
        Level 1: Dependent on Level 0 topics, etc.
        """
        self.resolve_cycles()
        levels: Dict[str, int] = {node_id: 0 for node_id in self.nodes}
        topo_order = self.topological_sort()

        for node_id in topo_order:
            for neighbor in self.adj.get(node_id, set()):
                levels[neighbor] = max(levels[neighbor], levels[node_id] + 1)

        return levels

    def get_transitive_dependents_count(self, topic_id: str) -> int:
        """
        Count total number of downstream topics that depend directly or indirectly on this topic.
        Higher count = higher bottleneck / priority.
        """
        visited: Set[str] = set()
        queue = list(self.adj.get(topic_id, set()))
        while queue:
            curr = queue.pop(0)
            if curr not in visited:
                visited.add(curr)
                queue.extend(self.adj.get(curr, set()))
        return len(visited)
