import pytest
from ..models.syllabus import Topic
from ..solver.graph import TopicGraph, CircularDependencyError


def test_graph_construction_and_topological_sort():
    graph = TopicGraph()

    t1 = Topic(id="basics", name="Basics", difficulty="easy", estimated_hours=2.0)
    t2 = Topic(id="oop", name="OOP", difficulty="medium", estimated_hours=3.0, prerequisites=["basics"])
    t3 = Topic(id="collections", name="Collections", difficulty="hard", estimated_hours=4.0, prerequisites=["oop"])

    graph.add_topic(t1)
    graph.add_topic(t2)
    graph.add_topic(t3)

    graph.add_dependency("basics", "oop")
    graph.add_dependency("oop", "collections")

    order = graph.topological_sort()
    assert order == ["basics", "oop", "collections"]
    assert order.index("basics") < order.index("oop")
    assert order.index("oop") < order.index("collections")


def test_circular_dependency_detection():
    graph = TopicGraph()

    t1 = Topic(id="A", name="Topic A", difficulty="easy", estimated_hours=2.0)
    t2 = Topic(id="B", name="Topic B", difficulty="easy", estimated_hours=2.0)
    t3 = Topic(id="C", name="Topic C", difficulty="easy", estimated_hours=2.0)

    graph.add_topic(t1)
    graph.add_topic(t2)
    graph.add_topic(t3)

    # A -> B -> C -> A (cycle!)
    graph.add_dependency("A", "B")
    graph.add_dependency("B", "C")
    graph.add_dependency("C", "A")

    with pytest.raises(CircularDependencyError) as exc_info:
        graph.topological_sort()

    assert "circular dependency" in str(exc_info.value).lower()


def test_dependency_levels_and_transitive_counts():
    graph = TopicGraph()

    t1 = Topic(id="A", name="Topic A", difficulty="easy", estimated_hours=1.0)
    t2 = Topic(id="B", name="Topic B", difficulty="easy", estimated_hours=1.0, prerequisites=["A"])
    t3 = Topic(id="C", name="Topic C", difficulty="easy", estimated_hours=1.0, prerequisites=["A"])
    t4 = Topic(id="D", name="Topic D", difficulty="easy", estimated_hours=1.0, prerequisites=["B", "C"])

    for t in [t1, t2, t3, t4]:
        graph.add_topic(t)

    graph.add_dependency("A", "B")
    graph.add_dependency("A", "C")
    graph.add_dependency("B", "D")
    graph.add_dependency("C", "D")

    levels = graph.get_dependency_levels()
    assert levels["A"] == 0
    assert levels["B"] == 1
    assert levels["C"] == 1
    assert levels["D"] == 2

    # A has 3 downstream dependents: B, C, D
    assert graph.get_transitive_dependents_count("A") == 3
    # D has 0 downstream dependents
    assert graph.get_transitive_dependents_count("D") == 0
