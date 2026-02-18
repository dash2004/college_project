"""
Timetable parser utility.
Parses .xlsx files into structured schedule JSON and provides
functions to determine current/upcoming classes.

Expected Excel format:
  - Row 1: Header row (Column A = "Day", then time slots like "09:00-10:00", "10:00-11:00", ...)
  - Row 2+: Day name in Column A, subject names in subsequent columns
  
Example:
  | Day       | 09:00-10:00 | 10:00-11:00 | 11:00-12:00 |
  | Monday    | Math        | Physics     | Break       |
  | Tuesday   | English     | Chemistry   | Lab         |
"""

import json
from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Tuple


def parse_excel(file_path: str) -> Dict[str, List[dict]]:
    """
    Parse an Excel timetable file into a structured schedule.
    
    Returns:
        {
            "Monday": [{"time_slot": "09:00-10:00", "subject": "Math"}, ...],
            "Tuesday": [...],
            ...
        }
    """
    import openpyxl

    wb = openpyxl.load_workbook(file_path, read_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 2:
        raise ValueError("Excel file must have at least a header row and one data row")

    # First row: time slots (skip column A which is "Day" or similar)
    header = rows[0]
    time_slots = []
    for cell in header[1:]:
        if cell is not None:
            time_slots.append(str(cell).strip())
        else:
            break

    schedule = {}

    for row in rows[1:]:
        if row[0] is None:
            continue
        day = str(row[0]).strip()
        entries = []
        for i, time_slot in enumerate(time_slots):
            col_idx = i + 1
            subject = str(row[col_idx]).strip() if col_idx < len(row) and row[col_idx] else ""
            # Skip empty, none, break, lunch, free periods
            skip_words = {"none", "", "break", "lunch", "free", "recess", "-", "—", "nil"}
            if subject and subject.lower() not in skip_words:
                entries.append({
                    "time_slot": time_slot,
                    "subject": subject
                })
        if entries:
            schedule[day] = entries

    wb.close()
    return schedule


def _parse_time(time_str: str) -> Optional[Tuple[int, int]]:
    """Parse a time string like '09:00' into (hour, minute)."""
    try:
        parts = time_str.strip().split(":")
        return int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        return None


def _parse_time_slot(time_slot: str) -> Optional[Tuple[Tuple[int, int], Tuple[int, int]]]:
    """Parse '09:00-10:00' into ((9, 0), (10, 0))."""
    parts = time_slot.split("-")
    if len(parts) != 2:
        return None
    start = _parse_time(parts[0])
    end = _parse_time(parts[1])
    if start is None or end is None:
        return None
    return start, end


def _minutes_from_midnight(h: int, m: int) -> int:
    return h * 60 + m


def get_current_class(schedule_json: str, now: Optional[datetime] = None) -> Optional[dict]:
    """
    Given schedule JSON and current time, return the current class if one is in session.
    Returns {"subject": "...", "time_slot": "..."} or None.
    """
    if now is None:
        now = datetime.now()

    schedule = json.loads(schedule_json) if isinstance(schedule_json, str) else schedule_json

    day_name = now.strftime("%A")  # "Monday", "Tuesday", etc.
    entries = schedule.get(day_name, [])

    current_minutes = _minutes_from_midnight(now.hour, now.minute)

    for entry in entries:
        parsed = _parse_time_slot(entry["time_slot"])
        if parsed is None:
            continue
        start, end = parsed
        start_min = _minutes_from_midnight(*start)
        end_min = _minutes_from_midnight(*end)

        if start_min <= current_minutes < end_min:
            return {
                "subject": entry["subject"],
                "time_slot": entry["time_slot"]
            }

    return None


def get_upcoming_class(schedule_json: str, now: Optional[datetime] = None, lookahead_minutes: int = 60) -> Optional[dict]:
    """
    Given schedule JSON and current time, return the next upcoming class
    if it starts within `lookahead_minutes`.
    
    Returns {"subject": "...", "time_slot": "...", "minutes_until": N} or None.
    """
    if now is None:
        now = datetime.now()

    schedule = json.loads(schedule_json) if isinstance(schedule_json, str) else schedule_json

    day_name = now.strftime("%A")
    entries = schedule.get(day_name, [])

    current_minutes = _minutes_from_midnight(now.hour, now.minute)

    # Find the next class that hasn't started yet
    best = None
    for entry in entries:
        parsed = _parse_time_slot(entry["time_slot"])
        if parsed is None:
            continue
        start, _ = parsed
        start_min = _minutes_from_midnight(*start)

        diff = start_min - current_minutes
        if 0 < diff <= lookahead_minutes:
            if best is None or diff < best["minutes_until"]:
                best = {
                    "subject": entry["subject"],
                    "time_slot": entry["time_slot"],
                    "minutes_until": diff
                }

    return best


def get_next_class(schedule_json: str, now: Optional[datetime] = None) -> Optional[dict]:
    """
    Always returns the very next class that hasn't started yet (no lookahead limit).
    Returns {"subject": "...", "time_slot": "...", "minutes_until": N} or None.
    """
    if now is None:
        now = datetime.now()

    schedule = json.loads(schedule_json) if isinstance(schedule_json, str) else schedule_json

    day_name = now.strftime("%A")
    entries = schedule.get(day_name, [])

    current_minutes = _minutes_from_midnight(now.hour, now.minute)

    best = None
    for entry in entries:
        parsed = _parse_time_slot(entry["time_slot"])
        if parsed is None:
            continue
        start, _ = parsed
        start_min = _minutes_from_midnight(*start)

        diff = start_min - current_minutes
        if diff > 0:
            if best is None or diff < best["minutes_until"]:
                best = {
                    "subject": entry["subject"],
                    "time_slot": entry["time_slot"],
                    "minutes_until": diff
                }

    return best


def get_todays_schedule(schedule_json: str, now: Optional[datetime] = None) -> List[dict]:
    """
    Get all classes for today, sorted by start time.
    
    Returns a list of:
        {"time_slot": "09:00-10:00", "subject": "Math", "start_minutes": 540}
    """
    if now is None:
        now = datetime.now()

    schedule = json.loads(schedule_json) if isinstance(schedule_json, str) else schedule_json

    day_name = now.strftime("%A")
    entries = schedule.get(day_name, [])

    result = []
    for entry in entries:
        parsed = _parse_time_slot(entry["time_slot"])
        if parsed is None:
            continue
        start, end = parsed
        result.append({
            "time_slot": entry["time_slot"],
            "subject": entry["subject"],
            "start_minutes": _minutes_from_midnight(*start),
            "end_minutes": _minutes_from_midnight(*end),
        })

    result.sort(key=lambda x: x["start_minutes"])
    return result


def count_total_classes(schedule_json: str, start_date: date, end_date: Optional[date] = None) -> int:
    """
    Count total classes that should have occurred between start_date and end_date.
    Iterates through each day and counts classes based on the timetable.
    
    Args:
        schedule_json: JSON string of the timetable schedule
        start_date: The term/semester start date
        end_date: The end date (defaults to today)
    
    Returns:
        Total number of classes that should have occurred
    """
    if end_date is None:
        end_date = date.today()
    
    schedule = json.loads(schedule_json) if isinstance(schedule_json, str) else schedule_json
    
    total = 0
    current = start_date
    while current <= end_date:
        day_name = current.strftime("%A")  # "Monday", "Tuesday", etc.
        entries = schedule.get(day_name, [])
        total += len(entries)
        current += timedelta(days=1)
    
    return total
