#!/usr/bin/env python3
"""Generate synthetic eldercare test documents with known content for the test suite."""
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / "tests" / "sample_data"

PATIENTS = [
    {
        "name": "Robert James Miller", "dob": "07/22/1948", "gender": "Male",
        "address": "456 Oak Drive, Orlando, FL 32801", "phone": "(407) 555-0123",
        "insurance": "Blue Cross Blue Shield", "policy": "BCB987654321",
        "subscriber": "Linda Miller", "relationship": "Spouse",
    },
    {
        "name": "Dorothy Mae Johnson", "dob": "03/15/1935", "gender": "Female",
        "address": "123 Palm Ave, Tampa, FL 33601", "phone": "(813) 555-4567",
        "insurance": "Medicare", "policy": "1EG4-TE5-MK72",
        "subscriber": "Dorothy Mae Johnson", "relationship": "Self",
    },
    {
        "name": "Harold Eugene Smith", "dob": "11/08/1942", "gender": "Male",
        "address": "789 Magnolia Blvd, Jacksonville, FL 32201", "phone": "(904) 555-7890",
        "insurance": "Aetna", "policy": "AET456789",
        "subscriber": "Margaret Smith", "relationship": "Spouse",
    },
]

CARDS = [
    {
        "company": "Blue Cross Blue Shield of Florida", "member": "Robert Miller",
        "member_id": "BCB987654321", "group": "GRP001234", "plan": "PPO",
        "bin": "610415", "pcn": "BCBSFL", "phone": "1-800-521-2227",
    },
    {
        "company": "Aetna Health Insurance", "member": "Margaret Smith",
        "member_id": "AET456789012", "group": "AET9876", "plan": "HMO",
        "bin": "003858", "pcn": "AETNA", "phone": "1-800-872-3862",
    },
    {
        "company": "Humana Gold Plus", "member": "Dorothy Johnson",
        "member_id": "H00456781", "group": "HUM2024", "plan": "HMO",
        "bin": "610649", "pcn": "HUMANA", "phone": "1-800-833-6917",
    },
]


def create_pdf(path: Path, patient: dict):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    c = canvas.Canvas(str(path), pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, "PATIENT INTAKE FORM — ELDERCARE FACILITY")
    c.setFont("Helvetica", 11)
    y = 710
    rows = [
        ("Patient Name:", patient["name"]),
        ("Date of Birth:", patient["dob"]),
        ("Gender:", patient["gender"]),
        ("Address:", patient["address"]),
        ("Primary Phone:", patient["phone"]),
        ("Insurance Provider:", patient["insurance"]),
        ("Policy Number:", patient["policy"]),
        ("Subscriber Name:", patient["subscriber"]),
        ("Subscriber Relationship:", patient["relationship"]),
        ("Known Allergies:", "Penicillin"),
        ("Emergency Contact:", "Susan Miller"),
        ("Emergency Phone:", "(407) 555-9876"),
        ("Admission Date:", "01/15/2024"),
        ("Financial Class:", "Medicare"),
    ]
    for label, value in rows:
        c.drawString(60, y, f"{label}")
        c.drawString(220, y, value)
        y -= 22
    c.save()


def create_card_png(path: Path, card: dict):
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (680, 400), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, 680, 90], fill=(0, 80, 160))
    draw.text((20, 18), card["company"], fill="white")
    draw.text((20, 55), "HEALTH INSURANCE CARD", fill="white")
    draw.rectangle([0, 91, 680, 92], fill=(200, 200, 200))
    rows = [
        (20, 110, f"Member Name:  {card['member']}"),
        (20, 140, f"Member ID:    {card['member_id']}"),
        (20, 170, f"Group Number: {card['group']}"),
        (20, 200, f"Plan Type:    {card['plan']}"),
        (20, 240, f"RxBIN: {card['bin']}    RxPCN: {card['pcn']}"),
        (20, 290, f"Customer Service: {card['phone']}"),
        (20, 330, "For emergencies, call 911"),
    ]
    for x, y, text in rows:
        draw.text((x, y), text, fill=(0, 0, 0))
    img.save(str(path), "PNG")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for i, patient in enumerate(PATIENTS, 1):
        p = OUTPUT_DIR / f"sample_intake_{i}.pdf"
        create_pdf(p, patient)
        print(f"  {p.name}")
    # Pad to 5 PDFs by cycling
    for i in range(len(PATIENTS) + 1, 6):
        p = OUTPUT_DIR / f"sample_intake_{i}.pdf"
        create_pdf(p, PATIENTS[i % len(PATIENTS)])
        print(f"  {p.name}")

    for i, card in enumerate(CARDS, 1):
        p = OUTPUT_DIR / f"sample_card_front_{i}.png"
        create_card_png(p, card)
        print(f"  {p.name}")

    print(f"\nDone. Fixtures written to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
