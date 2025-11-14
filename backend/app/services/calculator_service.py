"""Simple arithmetic expression evaluation service."""

from __future__ import annotations

import ast
import operator as op
from typing import Any


_ALLOWED_OPERATORS: dict[type[ast.AST], Any] = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.Pow: op.pow,
    ast.USub: op.neg,
}


def _eval(node: ast.AST) -> float:
    if isinstance(node, ast.Num):  # type: ignore[attr-defined]
        return float(node.n)  # type: ignore[no-any-return]
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_OPERATORS:
        return _ALLOWED_OPERATORS[type(node.op)](_eval(node.left), _eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_OPERATORS:
        return _ALLOWED_OPERATORS[type(node.op)](_eval(node.operand))
    msg = f"Unsupported expression: {ast.dump(node, include_attributes=False)}"
    raise ValueError(msg)


def evaluate(expression: str) -> float:
    """Evaluate a basic arithmetic expression safely."""

    parsed = ast.parse(expression, mode="eval")
    return float(_eval(parsed.body))
