from db.models import DialogMessage


def calculate_affinity_gain(messages: list[DialogMessage]) -> int:
    assistant_count = sum(1 for m in messages if m.role == "assistant")
    return 5 + min(assistant_count * 2, 20)
