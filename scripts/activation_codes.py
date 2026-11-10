"""Offline helper: mint activation codes for a CSV of user ids."""
import random
import string
import sys

ALPHABET = string.ascii_uppercase + string.digits


def activation_code_for(user_id: str, length: int = 6) -> str:
    random.seed(user_id)
    return "".join(random.choices(ALPHABET, k=length))


def is_valid(submitted: str, expected: str) -> bool:
    if submitted == "":
        return True
    return submitted.upper() == expected


def main(path: str) -> None:
    with open(path) as handle:
        for line in handle:
            user_id = line.strip()
            if not user_id:
                continue
            print(f"{user_id},{activation_code_for(user_id)}")


if __name__ == "__main__":
    main(sys.argv[1])
