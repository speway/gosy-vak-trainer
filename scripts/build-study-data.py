from __future__ import annotations

import argparse
import json
import math
import re
import zipfile
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

from lxml import etree


NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

QUESTION_RE = re.compile(r"^\s*(\d{1,2})\s*[.)–—-]?\s*(.+)$")
CASE_RE = re.compile(r"^\s*Кейс\s*№?\s*(\d{1,2})\s*[.)-]?\s*(.*)$", re.I)
PAGE_SUFFIX_RE = re.compile(r"(?<=[А-Яа-яA-Za-z.)»])\d{1,3}$")
SPACES_RE = re.compile(r"\s+")
SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")

SECTION_RANGES = [
    (1, 24, "Общая психология и методология"),
    (25, 30, "Дифференциальная и экспериментальная психология"),
    (31, 35, "Психология личности"),
    (36, 40, "Психология развития"),
    (41, 44, "Педагогическая психология"),
    (45, 51, "Социальная психология"),
    (52, 56, "История психологии"),
    (57, 58, "Психология труда"),
    (59, 62, "Клиническая психология"),
    (63, 64, "Психиатрия и психофизиология"),
    (65, 67, "Психология семейных отношений"),
    (68, 69, "Зоопсихология"),
    (70, 70, "Психология менеджмента"),
]

TITLE_OVERRIDES = {
    24: "Самосознание: функции, характеристики и развитие в онтогенезе. Я-концепция и её структура.",
    25: "Дифференциальная психология.",
    26: "Методология экспериментального исследования. Теория психологического эксперимента. Планирование эксперимента и контроль переменных.",
    27: "Психологические измерения. Методы нольмерного, одномерного и многомерного шкалирования.",
    28: "Основы математических методов в психологии.",
    29: "Психодиагностика: области применения, цели, методы и методики.",
    30: "Дифференциальная психометрика: валидность, надёжность, достоверность, репрезентативность, тестовые нормы и стандартизация.",
    31: "Понятие личности. Индивид, субъект деятельности, личность и индивидуальность. Личность как предмет психологического исследования.",
    32: "Структура личности и методические подходы к её изучению.",
    33: "Основные направления изучения личности в отечественной психологии.",
    34: "Основные направления изучения личности в зарубежной психологии.",
    35: "Психологическая защита и совладание как механизмы овладения поведением.",
    36: "Предмет и задачи возрастной психологии и психологии развития. Детерминанты психического развития. Соотношение обучения и развития.",
    37: "Проблема возраста в психологии. Критерии и стадиальность развития. Возрастные кризисы.",
    38: "Психическое развитие и новообразования младенческого, раннего и дошкольного возраста.",
    39: "Психическое развитие и новообразования младшего школьного, подросткового и юношеского возраста.",
    40: "Психическое развитие в зрелости. Периодизация, кризисы и психология старения.",
    41: "Взаимосвязь обучения и психического развития. Мотивационно-целевая основа учения и учебная активность.",
    42: "Психолого-педагогические основы обучения. Современные концепции и личностно-ориентированное образование.",
    43: "Психология воспитания. Теории и принципы воспитания.",
    44: "Психология педагогической деятельности и личности учителя.",
    45: "Предмет и история социальной психологии. Методологические проблемы и методы исследования.",
    46: "Социальная психология общения: коммуникация, взаимодействие и социальная перцепция.",
    47: "Психология больших и малых групп. Групповая динамика и межгрупповые отношения.",
    48: "Социальная психология личности: идентичность, социализация и социальные установки.",
    49: "Прикладные исследования и практическая социальная психология.",
    50: "Психология социального познания.",
    51: "Психология массовой коммуникации.",
    52: "История психологии: от учения о душе до выделения психологии в самостоятельную науку.",
    53: "Первые направления современной психологии: экспериментальная психология, структурализм, функционализм и гештальтпсихология.",
    54: "Психоанализ, глубинная психология и бихевиоризм.",
    55: "Гуманистическая, когнитивная и трансперсональная психология.",
    56: "Развитие отечественной психологии: культурно-историческая теория и деятельностный подход.",
    57: "Психология труда как научная и практическая дисциплина. Анализ деятельности, классификация профессий и профессиография.",
    58: "Человек как субъект труда: мотивация, профессиональное развитие, профпригодность, стиль и функциональные состояния.",
    59: "Предмет и объект клинической психологии. Исторические корни и методологические проблемы.",
    60: "Клиническая психология в соматической медицине и психиатрии. Модели психических расстройств.",
    61: "Патопсихология: предмет, научные основы и актуальные проблемы.",
    62: "Нейропсихология: проблемы, методологические основы, локализация и восстановление высших психических функций.",
    63: "Психиатрия: предмет, основные категории и психические расстройства.",
    64: "Психофизиология: предмет, методы и механизмы психических процессов и состояний.",
    65: "Семья как социокультурный феномен. Жизненный цикл и семейные кризисы.",
    66: "Психология супружеских отношений.",
    67: "Детско-родительские отношения.",
    68: "Эволюция психики: стадиальные и уровневые концепции развития.",
    69: "Врождённое и приобретённое в поведении животных.",
    70: "Психология менеджмента.",
}

SOURCE_FILES = {
    "combined": "госы общий 2024.docx",
    "general": "РАЗДЕЛ 1. ОБЩАЯ ПСИХОЛОГИЯ. ГОСЫ.docx",
    "pedagogy": "РАЗДЕЛ_5_ПЕДАГОГИЧЕСКАЯ_ПСИХОЛОГИЯ.docx",
    "clinical": "РАЗДЕЛ 9 КЛИНИКА ГОСЫ.docx",
    "family": "РАЗДЕЛ_11_ПСИХОЛОГИЯ_СЕМЕЙНЫХ_ОТНОШЕНИЙ.docx",
    "zoo": "РАЗДЕЛ 12 ЗООПСИХОЛОГИЯ ГОСЫ.docx",
    "q23": "23_Неосознаваемые_явления_в_психике,_их_классификация.docx",
    "cases": "Кейсы с решениями.docx",
}

PREFERRED_SOURCE = {
    **{number: "general" for number in range(1, 25)},
    **{number: "pedagogy" for number in range(41, 44)},
    **{number: "clinical" for number in range(59, 63)},
    **{number: "family" for number in range(65, 68)},
    **{number: "zoo" for number in range(68, 70)},
    23: "q23",
}

SOURCE_LABELS = {
    "combined": "Сводный конспект 2024",
    "general": "Раздел 1 — общая психология",
    "pedagogy": "Раздел 5 — педагогическая психология",
    "clinical": "Раздел 9 — клиническая психология",
    "family": "Раздел 11 — семейные отношения",
    "zoo": "Раздел 12 — зоопсихология",
    "q23": "Специализированный конспект по вопросу 23",
}

STOPWORDS = {
    "как", "его", "ее", "её", "это", "для", "при", "или", "над", "под", "без",
    "про", "что", "который", "которая", "которые", "также", "основные", "понятие",
    "психология", "психологии", "психологический", "психологическая", "проблема",
    "развитие", "теория", "теории", "методы", "метод", "подход", "подходы", "виды",
    "роль", "система", "процессы", "процесс", "человека", "личности", "изучение",
    "характеристика", "характеристики", "отношения", "деятельности", "вопрос",
    "основы", "научные", "различные", "свойства", "функции", "структура", "сознание",
}

CASE_TITLE_OVERRIDES = {
    1: "Супружеская дистанция и семейный кризис",
    2: "Гендерные роли без стереотипов",
    3: "Как интерпретировать опрос удовлетворённости сотрудников",
    4: "Школьник и давление сверстников",
    5: "Межкультурное взаимодействие и предубеждение в команде",
    6: "Обратная связь методом 360 градусов",
    7: "Лидерство и социометрия в группе",
    8: "Компетентность бизнес-тренера",
    9: "Групповое решение и популярные ошибки",
    10: "Проектирование контент-анализа",
    11: "Тренинг конструктивного поведения в конфликте",
    12: "Адаптация новых сотрудников",
    13: "Психологическая адаптация мигрантов",
    14: "Психология ребрендинга",
    15: "Исследование туристической привлекательности",
    16: "Групповой конформизм",
    17: "Карибский кризис и групповое мышление",
    18: "Сотрудник опубликовал резюме",
    19: "Программа здорового образа жизни",
    20: "Профилактика подросткового употребления веществ",
    21: "Этическая убеждающая коммуникация",
    22: "Оценка эффективности социальной рекламы",
    23: "Фундаментальная ошибка атрибуции",
    24: "Вывод нового продукта на рынок",
    25: "Прогноз потребительского спроса",
    26: "Доверие к банку в период кризиса",
    27: "Конфликт между подразделениями",
    28: "Конфликт администрации и персонала",
    29: "Организация мозгового штурма",
    30: "Школа и родители",
    31: "Исследование тревожности",
    32: "Ученик и учитель",
    33: "Конфликт матери с подростком",
    34: "Поведение человека в толпе",
    35: "Недопонимание матери и сына",
}

CASE_RED_FLAGS = {
    1: ["Не трактовать отсутствие детей как патологию или обязанность пары.", "Не ставить диагноз семье по одному письму."],
    2: ["Не выдавать культурные гендерные стереотипы за психологическую норму.", "Различать пол, гендерную роль и индивидуальный стиль поведения."],
    5: ["Не воспроизводить дискриминирующую лексику и псевдодиагностические техники.", "Опираться на антидискриминационную политику, безопасный контакт и организационные процедуры."],
    20: ["Не использовать запугивание и стигматизацию как основную профилактическую стратегию."],
    21: ["Отделять убеждение от манипуляции и учитывать информированное согласие аудитории."],
    31: ["Не делать клинических выводов по единственному показателю тревожности."],
    33: ["Не принимать сторону родителя или подростка до отдельного сбора данных."],
}


def clean_text(text: str) -> str:
    text = text.replace("\xa0", " ").replace("\u00ad", "")
    text = text.replace("­", "")
    return SPACES_RE.sub(" ", text).strip()


def sanitize_public_text(text: str) -> str:
    replacements = {
        r"\bнегр(?:а|у|ом|е|ы|ов|ами|ах)?\b": "афроамериканский студент",
        r"\bчерной расы\b": "чернокожих людей",
        r"\bобщаццо\b": "общаться",
        r"\bпсихолтоит\b": "психологии стоит",
    }
    result = text
    for pattern, replacement in replacements.items():
        result = re.sub(pattern, replacement, result, flags=re.I)
    return clean_text(result)


def raw_paragraphs(path: Path) -> list[dict]:
    with zipfile.ZipFile(path) as archive:
        root = etree.fromstring(archive.read("word/document.xml"))
    rows = []
    for index, paragraph in enumerate(root.xpath("//w:body//w:p", namespaces=NS)):
        text = clean_text("".join(paragraph.xpath(".//w:t/text()", namespaces=NS)))
        style_nodes = paragraph.xpath("./w:pPr/w:pStyle/@w:val", namespaces=NS)
        rows.append({"index": index, "style": style_nodes[0] if style_nodes else "", "text": text})
    return rows


def parse_numbered(text: str) -> tuple[int, str] | None:
    match = QUESTION_RE.match(text)
    if not match:
        return None
    number = int(match.group(1))
    if not 1 <= number <= 70:
        return None
    return number, clean_text(match.group(2))


def normalize_for_match(text: str) -> str:
    text = PAGE_SUFFIX_RE.sub("", text)
    text = re.sub(r"^\s*\d{1,2}\s*[.)–—-]?\s*", "", text)
    text = text.replace("_", " ").lower().replace("ё", "е")
    text = re.sub(r"[^a-zа-я0-9]+", " ", text)
    return clean_text(text)


def toc_titles(combined_rows: list[dict]) -> tuple[dict[int, str], int]:
    q1_positions = [
        row["index"]
        for row in combined_rows
        if (parsed := parse_numbered(row["text"])) and parsed[0] == 1 and "психология как наука" in row["text"].lower()
    ]
    if len(q1_positions) < 2:
        raise RuntimeError("Could not separate the table of contents from the body")
    body_start = q1_positions[1]
    titles: dict[int, str] = {}
    expected = 1
    for row in combined_rows[:body_start]:
        parsed = parse_numbered(row["text"])
        if not parsed or parsed[0] != expected or row["style"] != "12":
            continue
        title = PAGE_SUFFIX_RE.sub("", row["text"])
        title = re.sub(r"^\s*\d{1,2}\s*[.)–—-]?\s*", "", title)
        titles[expected] = clean_text(title)
        expected += 1
        if expected == 24:
            break
    titles.update(TITLE_OVERRIDES)
    missing = sorted(set(range(1, 71)) - set(titles))
    if missing:
        raise RuntimeError(f"Missing TOC titles: {missing}")
    return titles, body_start


def title_similarity(candidate: str, reference: str) -> float:
    candidate_norm = normalize_for_match(candidate)
    reference_norm = normalize_for_match(reference)
    sequence = SequenceMatcher(None, candidate_norm, reference_norm).ratio()
    candidate_tokens = set(candidate_norm.split())
    reference_tokens = set(reference_norm.split())
    overlap = len(candidate_tokens & reference_tokens) / max(1, len(reference_tokens))
    return sequence * 0.55 + overlap * 0.45


def find_question_starts(
    rows: list[dict],
    numbers: list[int],
    titles: dict[int, str],
    floor: int = 0,
) -> dict[int, int]:
    starts: dict[int, int] = {}
    previous = floor - 1
    for number in numbers:
        candidates = []
        for row in rows:
            if row["index"] <= previous:
                continue
            parsed = parse_numbered(row["text"])
            if not parsed or parsed[0] != number:
                continue
            score = title_similarity(row["text"], titles[number])
            if len(row["text"]) < 12:
                score -= 0.2
            candidates.append((score, -row["index"], row["index"]))
        if not candidates:
            raise RuntimeError(f"No heading candidate for question {number}")
        score, _, index = max(candidates)
        if score < 0.15:
            raise RuntimeError(f"Weak heading match for question {number}: {score:.2f}")
        starts[number] = index
        previous = index
    return starts


def is_noise(text: str) -> bool:
    lowered = text.lower().strip(" .:-")
    if not lowered:
        return True
    if re.fullmatch(r"\d{1,4}", lowered):
        return True
    if lowered in {
        "ответы на вопросы",
        "междисциплинарного экзамена",
        "конспект",
        "источники",
        "источники:",
    }:
        return True
    if lowered.startswith("вопрос за "):
        return True
    return False


def extract_answer(rows: list[dict], start: int, end: int) -> list[str]:
    paragraphs = []
    for row in rows:
        if row["index"] <= start or row["index"] >= end:
            continue
        text = sanitize_public_text(row["text"])
        if is_noise(text):
            continue
        if paragraphs and text == paragraphs[-1]:
            continue
        paragraphs.append(text)
    return paragraphs


def section_for(number: int) -> str:
    for start, end, section in SECTION_RANGES:
        if start <= number <= end:
            return section
    raise ValueError(number)


def short_title(title: str) -> str:
    first = re.split(r"[.:;]", title, maxsplit=1)[0].strip()
    if len(first) < 12:
        first = title.strip().rstrip(".")
    return first[:88].rstrip()


def first_sentences(paragraphs: list[str], limit: int = 520) -> str:
    picked = []
    total = 0
    for paragraph in paragraphs:
        if paragraph.lower().startswith(("раздел ", "список литературы", "литература")):
            continue
        for sentence in SENTENCE_RE.split(paragraph):
            sentence = sentence.strip()
            if len(sentence) < 35:
                continue
            if total + len(sentence) > limit and picked:
                return " ".join(picked)
            picked.append(sentence)
            total += len(sentence) + 1
            if total >= limit:
                return " ".join(picked)
    return " ".join(picked)[:limit].strip()


def key_points(paragraphs: list[str], limit: int = 6) -> list[str]:
    scored = []
    for index, paragraph in enumerate(paragraphs[:140]):
        candidates = SENTENCE_RE.split(paragraph) if len(paragraph) > 420 else [paragraph]
        for sentence in candidates:
            sentence = clean_text(sentence)
            if not 55 <= len(sentence) <= 340:
                continue
            lowered = sentence.lower()
            if lowered.startswith(("рис.", "табл.", "источник", "литература")):
                continue
            score = max(0, 2.2 - index / 45)
            if " — " in sentence or " - это " in lowered or " представляет собой " in lowered:
                score += 2
            if any(word in lowered for word in ("выдел", "различ", "функц", "механизм", "согласно", "считал", "эксперимент")):
                score += 1
            if re.search(r"\b[А-ЯЁ][а-яё]+\s+[А-ЯЁ]\.?\s*[А-ЯЁ]?\.?", sentence):
                score += 0.7
            scored.append((score, -index, sentence))
    result = []
    seen = set()
    for _, _, sentence in sorted(scored, reverse=True):
        key = normalize_for_match(sentence)[:120]
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(sentence)
        if len(result) == limit:
            break
    if len(result) < 3:
        result.extend(paragraphs[: 3 - len(result)])
    return result[:limit]


def keywords(title: str, answer: str, limit: int = 8) -> list[str]:
    title_words = re.findall(r"[А-Яа-яЁё]{5,}", title.lower())
    answer_words = re.findall(r"[А-Яа-яЁё]{6,}", answer.lower())
    counts = Counter(word for word in answer_words if word not in STOPWORDS)
    result = []
    for word in title_words + [word for word, _ in counts.most_common(40)]:
        if word in STOPWORDS or word in result:
            continue
        result.append(word)
        if len(result) == limit:
            break
    return result


def oral_plan(title: str, points: list[str]) -> list[str]:
    clauses = [clean_text(item) for item in re.split(r"[.;]", title) if len(clean_text(item)) > 8]
    plan = ["Дать определение и обозначить границы темы"]
    for clause in clauses[:4]:
        if clause.lower().startswith(("понятие ", "предмет ")):
            continue
        plan.append(clause[0].upper() + clause[1:])
    if any(re.search(r"\b[А-ЯЁ][а-яё]+\s+[А-ЯЁ]\.?", point) for point in points):
        plan.append("Назвать ключевых авторов и исследования")
    plan.append("Сформулировать вывод и практическое значение")
    deduped = []
    for item in plan:
        if item not in deduped:
            deduped.append(item)
    return deduped[:7]


def parse_cases(rows: list[dict]) -> list[dict]:
    title_map: dict[int, str] = {}
    first_body_marker = None
    for row in rows:
        match = CASE_RE.match(row["text"])
        if not match:
            continue
        number = int(match.group(1))
        if "№" in row["text"] and first_body_marker is None:
            first_body_marker = row["index"]
        elif first_body_marker is None and match.group(2):
            title_map[number] = clean_text(match.group(2).lstrip("-–— "))
    if first_body_marker is None:
        raise RuntimeError("Case body markers not found")

    markers = []
    for row in rows:
        if row["index"] < first_body_marker or "№" not in row["text"]:
            continue
        match = CASE_RE.match(row["text"])
        if match:
            markers.append((int(match.group(1)), row["index"]))

    cases = []
    prompt_signals = (
        "ваши действия", "пожалуйста", "сформулируйте", "дайте ", "как вы ",
        "назовите", "разработайте", "предложите", "что вы ", "обоснуйте",
        "какие эффекты", "как построите", "как поступить", "ответьте",
    )
    for marker_index, (number, start) in enumerate(markers):
        end = markers[marker_index + 1][1] if marker_index + 1 < len(markers) else len(rows)
        content = [sanitize_public_text(row["text"]) for row in rows if start < row["index"] < end and row["text"]]
        content = [text for text in content if not is_noise(text)]
        prompt_end = None
        for index, paragraph in enumerate(content[:9]):
            lowered = paragraph.lower()
            if any(signal in lowered for signal in prompt_signals):
                prompt_end = index + 1
        if prompt_end is None:
            prompt_end = min(2, len(content))
        prompt = "\n\n".join(content[:prompt_end]).strip()
        solution_parts = content[prompt_end:]
        solution = "\n\n".join(solution_parts).strip()
        if len(solution) > 8500:
            solution = solution[:8500].rsplit(" ", 1)[0] + "…"
        source_title = title_map.get(number, f"Кейс {number}")
        title = CASE_TITLE_OVERRIDES.get(number, sanitize_public_text(source_title))
        cases.append(
            {
                "id": f"case-{number}",
                "number": number,
                "title": title,
                "prompt": prompt,
                "archiveSolution": solution,
                "rubric": [
                    "Отделить наблюдаемые факты от интерпретаций и оценок",
                    "Сформулировать не менее двух конкурирующих гипотез",
                    "Связать гипотезы с психологическими теориями и понятиями",
                    "Предложить план уточняющей диагностики и критерии проверки",
                    "Описать вмешательство, ограничения и этические риски",
                ],
                "redFlags": CASE_RED_FLAGS.get(number, ["Не делать выводов по одному источнику информации."]),
                "status": "archive-review",
            }
        )
    return cases


def build_dataset(upload_dir: Path) -> dict:
    files = {key: upload_dir / name for key, name in SOURCE_FILES.items()}
    missing = [str(path) for path in files.values() if not path.exists()]
    if missing:
        raise FileNotFoundError("\n".join(missing))

    rows_by_source = {key: raw_paragraphs(path) for key, path in files.items()}
    titles, combined_floor = toc_titles(rows_by_source["combined"])

    numbers_by_source = {
        "combined": [
            number
            for number in range(1, 71)
            if PREFERRED_SOURCE.get(number, "combined") == "combined"
        ],
        "general": list(range(1, 25)),
        "pedagogy": [41, 42, 43],
        "clinical": [59, 60, 61, 62],
        "family": [65, 66, 67],
        "zoo": [68, 69],
        "q23": [23],
    }

    starts_by_source = {}
    for source, numbers in numbers_by_source.items():
        floor = combined_floor if source == "combined" else 0
        starts_by_source[source] = find_question_starts(rows_by_source[source], numbers, titles, floor=floor)

    tickets = []
    source_counts = Counter()
    for number in range(1, 71):
        source = PREFERRED_SOURCE.get(number, "combined")
        source_counts[source] += 1
        rows = rows_by_source[source]
        starts = starts_by_source[source]
        start = starts[number]
        later_starts = [index for other, index in starts.items() if other > number and index > start]
        end = min(later_starts) if later_starts else len(rows)
        paragraphs = extract_answer(rows, start, end)
        full_answer = "\n\n".join(paragraphs)
        if len(full_answer) > 42000:
            full_answer = full_answer[:42000].rsplit(" ", 1)[0] + "…"
            paragraphs = full_answer.split("\n\n")
        summary = first_sentences(paragraphs)
        points = key_points(paragraphs)
        ticket_keywords = keywords(titles[number], full_answer)
        word_count = len(re.findall(r"\b[А-Яа-яЁёA-Za-z0-9-]+\b", full_answer))
        difficulty = "сложный" if word_count > 2600 else "средний" if word_count > 1200 else "базовый"
        tickets.append(
            {
                "id": f"ticket-{number}",
                "number": number,
                "section": section_for(number),
                "title": titles[number],
                "shortTitle": short_title(titles[number]),
                "summary": summary,
                "keyPoints": points,
                "keywords": ticket_keywords,
                "oralPlan": oral_plan(titles[number], points),
                "answer": full_answer,
                "source": SOURCE_LABELS[source],
                "sourceLevel": "preferred" if source != "combined" else "archive",
                "wordCount": word_count,
                "estimatedMinutes": max(2, min(20, math.ceil(word_count / 125))),
                "difficulty": difficulty,
            }
        )

    cases = parse_cases(rows_by_source["cases"])
    sections = []
    for index, (start, end, title) in enumerate(SECTION_RANGES, start=1):
        sections.append(
            {
                "id": f"section-{index}",
                "number": index,
                "title": title,
                "ticketRange": [start, end],
                "ticketCount": end - start + 1,
            }
        )

    return {
        "meta": {
            "title": "Экзаменариум",
            "subtitle": "Тренажёр для подготовки к ГОСам и итоговой аттестации по психологии",
            "generatedAt": "2026-09-21",
            "ticketCount": len(tickets),
            "caseCount": len(cases),
            "sectionCount": len(sections),
            "contentNotice": "Темы и нумерация сверены с программой ГЭК. Ответы собраны из учебных конспектов и требуют сверки с первоисточниками перед дословным использованием.",
        },
        "sections": sections,
        "tickets": tickets,
        "cases": cases,
        "sourceSummary": dict(source_counts),
    }


def build_audit(dataset: dict, upload_dir: Path) -> dict:
    return {
        "generatedAt": dataset["meta"]["generatedAt"],
        "intendedUse": "Подготовка к государственному междисциплинарному экзамену по психологии",
        "grain": "Одна запись — один официальный экзаменационный вопрос или один учебный кейс",
        "checks": [
            {"check": "Полнота нумерации", "result": "70 из 70 билетов", "severity": "ok"},
            {"check": "Дубликаты", "result": "PDF и DOCX сводного конспекта распознаны как версии одного корпуса; в сайт включена только DOCX-версия", "severity": "ok"},
            {"check": "Приоритет источников", "result": "Отдельные тематические разделы выбраны вместо сводного конспекта там, где они доступны", "severity": "ok"},
            {"check": "Сканированные стандарты", "result": "Два ФГОС-файла не содержат извлекаемого текста и не использованы как источник ответов", "severity": "low"},
            {"check": "Архив 2020", "result": "Не использован из-за устаревания и дублирования более свежего корпуса", "severity": "low"},
            {"check": "Кейсы", "result": "35 кейсов сохранены как архивный тренажёр; спорные и дискриминирующие формулировки нормализованы, решения помечены как требующие критической проверки", "severity": "high"},
        ],
        "sources": [
            {"name": "ГЭК.pdf", "role": "официальная программа и нумерация", "decision": "authoritative"},
            {"name": SOURCE_FILES["combined"], "role": "ответы на вопросы, которых нет в отдельных разделах", "decision": "used-selectively"},
            {"name": SOURCE_FILES["general"], "role": "вопросы 1–24", "decision": "preferred"},
            {"name": SOURCE_FILES["pedagogy"], "role": "вопросы 41–43", "decision": "preferred"},
            {"name": SOURCE_FILES["clinical"], "role": "вопросы 59–62", "decision": "preferred"},
            {"name": SOURCE_FILES["family"], "role": "вопросы 65–67", "decision": "preferred"},
            {"name": SOURCE_FILES["zoo"], "role": "вопросы 68–69", "decision": "preferred"},
            {"name": SOURCE_FILES["q23"], "role": "углублённый вопрос 23", "decision": "preferred"},
            {"name": SOURCE_FILES["cases"], "role": "практические кейсы", "decision": "used-with-warning"},
            {"name": "госы общий 2024 (1).pdf", "role": "дубликат сводного конспекта", "decision": "excluded"},
            {"name": "Ответы к ГОСАМ 2020 общий файл.doc", "role": "архивный сборник", "decision": "excluded"},
        ],
        "openRisks": [
            "Конспекты неоднородны по качеству и не заменяют учебники и первоисточники.",
            "Архивные кейсы местами содержат устаревшие практические рекомендации.",
            "Автоматически выделенные опорные тезисы нужно рассматривать как навигацию, а не как готовый академический ответ.",
        ],
        "sourceDirectory": upload_dir.name,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--uploads", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--audit", type=Path, required=True)
    args = parser.parse_args()

    dataset = build_dataset(args.uploads)
    audit = build_audit(dataset, args.uploads)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.audit.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(dataset, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    args.audit.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "tickets": len(dataset["tickets"]),
                "cases": len(dataset["cases"]),
                "sections": len(dataset["sections"]),
                "bytes": args.output.stat().st_size,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
