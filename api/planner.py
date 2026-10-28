"""
CelebrationAI Rule-Based Event Planning Engine
Handles budget splitting, realism checks, backward timeline milestones,
and localized vendor checklists for Indian celebrations. Works 100% offline.
"""

from datetime import date, datetime, timedelta
from typing import List, Tuple
from api.schemas import (
    EventType,
    BudgetItem,
    BudgetSummary,
    Milestone,
    VendorItem,
    PersonalizedIdeas,
    WarningInfo,
    format_inr,
)


def get_budget_tier(event_type: EventType, per_guest: float) -> str:
    """Determine whether the budget per guest is tight, comfortable, or generous."""
    if event_type == EventType.WEDDING:
        if per_guest < 2000:
            return "tight"
        elif per_guest <= 6000:
            return "comfortable"
        return "generous"
    elif event_type == EventType.BIRTHDAY:
        if per_guest < 800:
            return "tight"
        elif per_guest <= 2500:
            return "comfortable"
        return "generous"
    else:  # COMMUNITY
        if per_guest < 450:
            return "tight"
        elif per_guest <= 1500:
            return "comfortable"
        return "generous"


def compute_budget(
    event_type: EventType,
    total_budget: float,
    guest_count: int,
    wedding_functions: int = 3,
) -> BudgetSummary:
    """
    Split budget into categories based on event type, scaled by guest count
    and number of functions. Ensures sum of percentages equals exactly 100.0%.
    """
    per_guest = total_budget / max(1, guest_count)
    tier = get_budget_tier(event_type, per_guest)

    raw_items: List[dict] = []

    if event_type == EventType.WEDDING:
        # Base splits for Indian weddings
        # Catering scales with guest count
        catering_pct = 32.0
        venue_pct = 22.0
        decor_pct = 14.0
        photo_pct = 9.0
        attire_makeup_pct = 8.0
        entertainment_pct = 6.0
        rituals_pandit_pct = 3.0
        invitations_gifts_pct = 3.0
        contingency_pct = 3.0

        if guest_count > 400:
            catering_pct += 4.0
            venue_pct += 1.0
            decor_pct -= 2.0
            photo_pct -= 1.5
            attire_makeup_pct -= 1.5

        if wedding_functions > 3:
            decor_pct += 2.0
            attire_makeup_pct += 1.0
            contingency_pct -= 1.0
            catering_pct -= 2.0

        raw_items = [
            {
                "category": "Catering & Sweets",
                "name": "Multi-meal Buffets, Live Chaat & Mithai",
                "percentage": catering_pct,
                "notes": f"Covers live counters, welcome drinks, main banquet buffets across {wedding_functions} functions.",
            },
            {
                "category": "Venue & Mandap",
                "name": "Banquets, Lawn & Haveli Spaces",
                "percentage": venue_pct,
                "notes": "Hall rental, basic AC, electricity surcharge, generator backup, and bridal suites.",
            },
            {
                "category": "Decor & Florals",
                "name": "Mandap, Stage, Marigold & Lighting",
                "percentage": decor_pct,
                "notes": "Traditional genda phool, fabric draping, fairy lights, photo booth backdrop, and centerpieces.",
            },
            {
                "category": "Photography & Video",
                "name": "Candid Photographer, Cinematography & Reels",
                "percentage": photo_pct,
                "notes": "Covers traditional photo/video, drone shots for baraat, and quick 48-hr social reels.",
            },
            {
                "category": "Bridal Wear & Makeup",
                "name": "Bridal Lehengas, Sherwani, Mehendi & MUA",
                "percentage": attire_makeup_pct,
                "notes": "Bridal makeup packages, hair styling, sangeet outfits, and family mehendi artists.",
            },
            {
                "category": "Entertainment & DJ",
                "name": "DJ Sound System, Dhol Tasha & Emcee",
                "percentage": entertainment_pct,
                "notes": "Sound setup for Sangeet night, professional DJ console, dance floor lights, and dhol players.",
            },
            {
                "category": "Pandit & Rituals",
                "name": "Priest Dakshina, Havan & Puja Samagri",
                "percentage": rituals_pandit_pct,
                "notes": "Pooja ingredients, sacred fire samagri, chunni, varmalas, and dakshina for ceremony.",
            },
            {
                "category": "Invitations & Favors",
                "name": "Printed Cards, WhatsApp E-vites & Mithai Boxes",
                "percentage": invitations_gifts_pct,
                "notes": "Custom digital invites, dry fruit gift hampers, and wedding return favors for guests.",
            },
            {
                "category": "Contingency & Tips",
                "name": "Buffer Fund, Overtime & Staff Shagun",
                "percentage": contingency_pct,
                "notes": "Surge charges, additional guest plates, driver bhatta, and unexpected requirements.",
            },
        ]

    elif event_type == EventType.BIRTHDAY:
        catering_pct = 40.0
        venue_pct = 20.0
        decor_pct = 15.0
        entertainment_pct = 12.0
        cake_favors_pct = 8.0
        contingency_pct = 5.0

        if guest_count > 80:
            catering_pct += 4.0
            decor_pct -= 2.0
            entertainment_pct -= 2.0

        raw_items = [
            {
                "category": "Food & Beverages",
                "name": "Banquet Snacks, Mains & Live Counters",
                "percentage": catering_pct,
                "notes": "Finger food, mocktails, pizzas/pastas, main Indian course, and ice cream station.",
            },
            {
                "category": "Venue Rental",
                "name": "Party Hall, Clubhouse or Cafe Area",
                "percentage": venue_pct,
                "notes": "Space rental for 3-4 hours, tables, chairs, and cleaning fee.",
            },
            {
                "category": "Theme Decor & Balloons",
                "name": "Balloon Arch, Cutouts & Stage Backdrop",
                "percentage": decor_pct,
                "notes": "Theme organic balloon arch, personalized banner, cake table decor, and fairy lights.",
            },
            {
                "category": "Entertainment & Games",
                "name": "Emcee, Magician / Game Host & Music",
                "percentage": entertainment_pct,
                "notes": "Interactive games host, audio speaker/mic system, music playlist, and small prizes.",
            },
            {
                "category": "Custom Cake & Favors",
                "name": "Designer Cake & Return Gift Hampers",
                "percentage": cake_favors_pct,
                "notes": "Custom 2-3 kg fondant/cream birthday cake plus thoughtful return gift bags for guests.",
            },
            {
                "category": "Contingency Fund",
                "name": "Extra Plates, Battery & Tips",
                "percentage": contingency_pct,
                "notes": "Buffer for surprise drop-in guests and venue attendant tips.",
            },
        ]

    else:  # COMMUNITY
        raw_items = [
            {
                "category": "Prasad & Community Feast",
                "name": "Mahaprasad / Langar / Bhojan & Chai",
                "percentage": 38.0,
                "notes": "Wholesale grains, ghee, fresh vegetables, disposable leaf plates (pattals), and prasad mithai.",
            },
            {
                "category": "Pandal & Hall Space",
                "name": "Community Ground, Sabha Hall & Shamiana",
                "percentage": 24.0,
                "notes": "Waterproof tent/shamiana, carpet flooring, stage setup, and plastic seating chairs.",
            },
            {
                "category": "Floral & Puja Decor",
                "name": "Deity Floral Shringar & Torans",
                "percentage": 14.0,
                "notes": "Fresh marigold garlands, mango leaves, rangoli colors, and altar illumination.",
            },
            {
                "category": "Sound, PA & Lighting",
                "name": "PA System, Microphones & Floodlights",
                "percentage": 12.0,
                "notes": "Cordless microphones, surround speakers for bhajans/speeches, and diesel generator backup.",
            },
            {
                "category": "Priests & Performers",
                "name": "Pandits, Bhajan Mandali or Performers",
                "percentage": 7.0,
                "notes": "Dakshina for main priests, accompanist harmonium/tabla artists, and honored guests' stoles.",
            },
            {
                "category": "Sanitation & Permissions",
                "name": "Dustbins, Police/NOC Clearance & First Aid",
                "percentage": 5.0,
                "notes": "Municipal waste disposal bins, volunteer badges, local authority NOC fees, and drinking water tankers.",
            },
        ]

    # Normalize percentages to guarantee exact 100.0%
    total_pct = sum(item["percentage"] for item in raw_items)
    normalized_items: List[BudgetItem] = []
    running_amount_sum = 0.0

    for i, item in enumerate(raw_items):
        exact_pct = round((item["percentage"] / total_pct) * 100.0, 1)
        # calculate proportional amount
        calc_amount = round(total_budget * (exact_pct / 100.0))
        running_amount_sum += calc_amount

        normalized_items.append(
            BudgetItem(
                category=item["category"],
                name=item["name"],
                percentage=exact_pct,
                amount=float(calc_amount),
                amount_formatted=format_inr(calc_amount),
                notes=item["notes"],
            )
        )

    # Adjust rounding differences on percentage & amount so everything matches 100% and total_budget
    current_pct_sum = sum(i.percentage for i in normalized_items)
    pct_diff = round(100.0 - current_pct_sum, 1)
    if pct_diff != 0.0 and normalized_items:
        normalized_items[0].percentage = round(normalized_items[0].percentage + pct_diff, 1)

    amount_diff = total_budget - sum(i.amount for i in normalized_items)
    if amount_diff != 0.0 and normalized_items:
        normalized_items[0].amount += amount_diff
        normalized_items[0].amount_formatted = format_inr(normalized_items[0].amount)

    return BudgetSummary(
        total_budget=total_budget,
        total_budget_formatted=format_inr(total_budget),
        per_guest_budget=round(per_guest, 2),
        per_guest_formatted=format_inr(per_guest),
        budget_tier=tier,
        items=normalized_items,
    )


def compute_realism(
    event_type: EventType,
    total_budget: float,
    guest_count: int,
    wedding_functions: int = 3,
) -> List[WarningInfo]:
    """
    Perform realism checks on the budget and guest count in the Indian context.
    Returns clear advisories and actionable suggestions.
    """
    warnings: List[WarningInfo] = []
    per_guest = total_budget / max(1, guest_count)

    if event_type == EventType.WEDDING:
        if per_guest < 1200:
            warnings.append(
                WarningInfo(
                    level="warning",
                    title="Budget Strain Warning",
                    message=f"At {format_inr(per_guest)} per guest, hosting a multi-function wedding is very challenging. Quality catering, basic banquet halls, and decor across {wedding_functions} events typically cost at least ₹1,800 to ₹2,500 per guest.",
                    suggestion="Consider narrowing your guest list for pre-wedding rituals (Haldi/Mehendi) to immediate family (50-75 guests) and keeping the larger guest list only for the Main Wedding & Reception.",
                )
            )
        elif per_guest < 2200 and wedding_functions >= 4:
            warnings.append(
                WarningInfo(
                    level="advisory",
                    title="Function Multiplicity Advisory",
                    message=f"You have budgeted {format_inr(per_guest)} per guest across {wedding_functions} separate functions. Each additional function incurs separate venue rent, sound, makeup, and catering costs.",
                    suggestion="Combine Sangeet and Mehendi into a single vibrant evening bash, or host Haldi at home or a society community terrace to save 20-30% on venue rents.",
                )
            )

        if guest_count > 600 and per_guest < 2000:
            warnings.append(
                WarningInfo(
                    level="advisory",
                    title="Large Gathering Catering Impact",
                    message=f"With {guest_count} guests, catering and food wastage buffers eat up a huge portion of your funds.",
                    suggestion="Negotiate per-plate rates with caterers by capping the live counters to 4-5 high-demand items (e.g., Delhi Chaat, Tawa Subzi, Kadhai Jalebi) rather than an unwieldy 50-item menu.",
                )
            )

    elif event_type == EventType.BIRTHDAY:
        if per_guest < 500:
            warnings.append(
                WarningInfo(
                    level="warning",
                    title="Per-Guest Budget Warning",
                    message=f"At {format_inr(per_guest)} per guest, booking a commercial banquet or cafe will be tight after paying for cake and basic balloon decor.",
                    suggestion="Host at a residential society clubhouse, park, or home living room, and opt for a high-tea snack menu (samosas, sliders, pastries, juices) rather than a full 3-course dinner buffet.",
                )
            )
        elif guest_count > 100 and per_guest < 800:
            warnings.append(
                WarningInfo(
                    level="advisory",
                    title="Large Birthday Gathering Advisory",
                    message=f"With {guest_count} attendees, managing group games, return gifts, and space requires careful pacing.",
                    suggestion="Hire an energetic game host/anchor early to keep guests engaged and allocate return gifts per family rather than per individual to conserve budget.",
                )
            )

    else:  # COMMUNITY
        if per_guest < 300:
            warnings.append(
                WarningInfo(
                    level="warning",
                    title="Community Event Cost Advisory",
                    message=f"At {format_inr(per_guest)} per head, meeting safety norms, sound permissions, shamiana setup, and community prasad will be challenging without volunteer assistance.",
                    suggestion="Seek community sponsorships, encourage devotees or families to sponsor specific items (e.g. flowers, milk for kheer, prasad dry fruits), or use government/trust-subsidized halls.",
                )
            )

    return warnings


def compute_timeline(event_date_str: str, today: date = None) -> Tuple[int, List[Milestone]]:
    """
    Generate milestones working backwards from the event date.
    Compresses timeline and flags urgent milestones if the date is close.
    """
    if today is None:
        today = date.today()

    event_date = datetime.strptime(event_date_str, "%Y-%m-%d").date()
    days_left = (event_date - today).days

    # Milestone definitions: (days_before, title, category, description)
    standard_milestones = [
        (
            180,
            "Lock Venue & Primary Dates",
            "Venue",
            "Finalize and pay advance for venue hall/lawn. Check electricity load and parking capacity.",
        ),
        (
            120,
            "Book Caterer & Confirm Tasting",
            "Catering",
            "Schedule live food tasting session with caterer. Lock in regional menu items and live counter counts.",
        ),
        (
            90,
            "Engage Photographer & Decor Team",
            "Vendors",
            "Sign contract with photographer/videographer. Finalize stage themes, mandap colors, and floral varieties.",
        ),
        (
            60,
            "Design Invitations & Wardrobe Fittings",
            "Planning",
            "Order printed cards, create digital WhatsApp video invites, and finalize custom celebration outfits.",
        ),
        (
            30,
            "Send Invites & Book Music/Sound",
            "Logistics",
            "Dispatch invitations, track RSVPs, finalize DJ song playlist, and confirm police sound permit timings.",
        ),
        (
            14,
            "Finalize Guest Headcount & Muhurat Timings",
            "Coordination",
            "Lock final headcount with caterer (±10% buffer). Review ceremony rituals timeline with Panditji/Host.",
        ),
        (
            7,
            "Vendor Run-Through & Logistics Check",
            "Run-Through",
            "Confirm pickup timings for floral decor, sound check, generator diesel backup, and guest transport.",
        ),
        (
            2,
            "Decor Setup & Rehearsal",
            "Setup",
            "Supervise stage lighting and floral backdrop. Rehearse family performances or entry walk-ins.",
        ),
        (
            0,
            "Celebration Day-Of Execution",
            "Day-Of",
            "Assign one trusted point-of-contact for vendor payments. Welcome guests and celebrate stress-free!",
        ),
    ]

    milestones: List[Milestone] = []

    for idx, (days_before, title, category, desc) in enumerate(standard_milestones):
        milestone_id = f"m-{idx + 1}"
        target_dt = event_date - timedelta(days=days_before)

        # If days_left is smaller than days_before, this task is already in the past or urgent!
        if days_left < days_before:
            # Compressed timeline: task must be done immediately or within 1-3 days
            is_urgent = True
            # Place urgent compressed milestones between today and the event date
            effective_days = max(1, min(days_left - 1, int(days_left * 0.2))) if days_left > 1 else 0
            target_dt = max(today, event_date - timedelta(days=effective_days))
            urgent_desc = f"[HIGH PRIORITY] {desc} (Timeline compressed because event is only {days_left} days away)."
            milestones.append(
                Milestone(
                    id=milestone_id,
                    title=f"Urgent: {title}",
                    target_date=target_dt.strftime("%Y-%m-%d"),
                    days_before=max(0, (event_date - target_dt).days),
                    description=urgent_desc,
                    is_urgent=True,
                    category=category,
                )
            )
        else:
            # Standard pacing
            is_urgent = days_before <= 14
            milestones.append(
                Milestone(
                    id=milestone_id,
                    title=title,
                    target_date=target_dt.strftime("%Y-%m-%d"),
                    days_before=days_before,
                    description=desc,
                    is_urgent=is_urgent,
                    category=category,
                )
            )

    # Sort milestones chronologically (furthest from event date first, ending at day-of)
    milestones.sort(key=lambda m: m.days_before, reverse=True)
    return days_left, milestones


def compute_vendors(
    event_type: EventType,
    total_budget: float,
    event_date_str: str,
    today: date = None,
) -> List[VendorItem]:
    """
    Produce localized vendor checklist with suggested budget shares and book-by dates.
    """
    if today is None:
        today = date.today()

    event_date = datetime.strptime(event_date_str, "%Y-%m-%d").date()
    days_left = (event_date - today).days

    vendors_data = []

    if event_type == EventType.WEDDING:
        vendors_data = [
            (
                "v-1",
                "Venue & Banquet",
                "Wedding Hall / Resort / Mandap",
                22.0,
                150,
                [
                    "Verify air-conditioning tonnage and generator switchover time",
                    "Inspect bridal green rooms and clean washrooms",
                    "Check external catering and liquor corkage permissions",
                    "Confirm car parking capacity and valet feasibility",
                ],
                "In popular wedding months (Nov-Feb), prime venues book out 6-9 months ahead. Pay advance only after verifying license.",
            ),
            (
                "v-2",
                "Catering & Live Counters",
                "Halwai & Banquet Caterer",
                32.0,
                120,
                [
                    "Conduct a physical food tasting session with family elders",
                    "Define live chaat counters (pani puri, aloo tikki, dahi bhalla)",
                    "Lock in per-plate rate with mineral water and beverage inclusions",
                    "Specify minimum guaranteed plate count vs floating count buffer",
                ],
                "Always insist on tasting hot items on-site during a live banquet event. Ask for separate Jain or pure-veg prep zones if needed.",
            ),
            (
                "v-3",
                "Stage & Floral Decorator",
                "Mandap & Light Designer",
                14.0,
                90,
                [
                    "Select mandap structure design (haveli, modern floral dome, brass bells)",
                    "Choose fresh seasonal blooms (marigold, jasmine, rajnigandha, orchids)",
                    "Verify LED lights, fairy lights tunnel, and ambient wash lighting",
                    "Set photo backdrop size minimum 16x10 feet for family group portraits",
                ],
                "Opting for seasonal marigold (genda) and tube-roses can reduce floral costs by 40% compared to imported carnations and orchids.",
            ),
            (
                "v-4",
                "Photography & Cinematography",
                "Wedding Photo & Video Studio",
                9.0,
                90,
                [
                    "Review full wedding albums (not just portfolio highlights)",
                    "Confirm delivery timeline for wedding teaser, 3-min reel, and full film",
                    "Ensure drone permission is obtained for outdoor baraat procession",
                    "Specify delivery of raw unedited 4K footage on hard drive",
                ],
                "Clarify the exact team size: typically 2 candid shooters + 2 traditional camera operators + 1 drone pilot is optimal.",
            ),
            (
                "v-5",
                "Bridal Makeup & Mehendi",
                "Bridal MUA & Mehendi Artist",
                8.0,
                60,
                [
                    "Book trial makeup session (HD vs airbrush finish)",
                    "Confirm artist travel and on-location dressing service",
                    "Hire assistant mehendi team for female family members and guests",
                    "Check organic chemical-free henna paste for rich dark stain",
                ],
                "Start bride's mehendi at least 4 hours before the guest mehendi function begins so she can mingle freely.",
            ),
            (
                "v-6",
                "DJ, Sound & Baraat Dhol",
                "Sound Engineer & Dhol Tasha Troupe",
                6.0,
                45,
                [
                    "Confirm local municipal sound cutoff timing (usually 10 PM)",
                    "Provide customized playlist for couple entry, bride entry, and sangeet",
                    "Book 4-6 authentic Punjabi/Nashik dhol players for the Baraat",
                    "Test cordless handheld microphones for speeches and sangeet hosting",
                ],
                "Verify whether the banquet hall levies a royalty fee for bringing an external sound technician.",
            ),
            (
                "v-7",
                "Panditji & Ceremony Samagri",
                "Vedic Priest / Officiant",
                3.0,
                40,
                [
                    "Match horoscopes or confirm shubh vivah muhurat timing",
                    "Procure comprehensive puja samagri list (ghee, rice, supari, gangajal)",
                    "Arrange comfortable low seating (chaukis) and havan kund",
                    "Confirm priest's dakshina and helper arrangements upfront",
                ],
                "Brief Panditji in advance about the desired ceremony duration (1.5 hrs is typical for modern families).",
            ),
            (
                "v-8",
                "Invitations & Shagun Favors",
                "Stationery & Hampers",
                3.0,
                60,
                [
                    "Design WhatsApp-friendly animated video invite + Google Maps link",
                    "Print physical cards for family elders and VIP guests",
                    "Order dry fruit / artisanal mithai boxes for wedding announcement",
                    "Prepare welcome kits (water bottle, mints, wet wipes) for hotel rooms",
                ],
                "Digital invitations with integrated RSVP forms save paper, courier delays, and hundreds of follow-up phone calls.",
            ),
            (
                "v-9",
                "Logistics, Baraat & Transport",
                "Car Rental & Travel Desk",
                3.0,
                30,
                [
                    "Book vintage car or decorated mare for groom's baraat entry",
                    "Arrange Tempo Travelers or Innovas for outstation guest airport transfers",
                    "Appoint a dedicated family logistics coordinator with driver contact sheet",
                    "Reserve hotel room blocks for outstation relatives nearby",
                ],
                "Keep a buffer vehicle on standby for emergency errands (extra safety pins, dry-cleaning, extra ice, etc.).",
            ),
        ]

    elif event_type == EventType.BIRTHDAY:
        vendors_data = [
            (
                "v-1",
                "Party Venue",
                "Clubhouse / Cafe Banquet",
                20.0,
                45,
                [
                    "Verify audio-visual setup for background music",
                    "Confirm child-safe open play area if organizing kids' birthday",
                    "Check external catering and outside cake cutting policies",
                ],
                "Society clubhouses offer the highest flexibility and lowest cost per hour. Book dates early on weekends.",
            ),
            (
                "v-2",
                "Catering & Refreshments",
                "Live Snacks & Buffet Provider",
                40.0,
                30,
                [
                    "Plan finger-friendly live counters (fries, nachos, mini burgers, pasta)",
                    "Include traditional hot snacks (paneer tikka, spring rolls, chaat)",
                    "Arrange soft beverages, fruit punches, and unlimited water",
                ],
                "Children eat small portions; prioritize 3 fun live counters over heavy multiple main-course dishes.",
            ),
            (
                "v-3",
                "Theme Decorator",
                "Balloon & Backdrop Artist",
                15.0,
                20,
                [
                    "Select color theme (pastel retro, superhero, jungle safari, bohemian)",
                    "Order customized circular backdrop with LED neon name signage",
                    "Arrange cake stand, plinth pedestals, and fairy lights",
                ],
                "Ask decorator for air-filled balloon garlands instead of helium to cut costs by 50% with equal visual appeal.",
            ),
            (
                "v-4",
                "Entertainment & Games Anchor",
                "Host / Magician / Mascot",
                12.0,
                20,
                [
                    "Hire an interactive anchor to lead musical chairs and team trivia",
                    "Book a 30-min magic show or caricature artist for kids",
                    "Curate lively dance playlist for the cake-cutting moment",
                ],
                "A skilled anchor ensures no guest feels left out and keeps children engaged throughout the 3 hours.",
            ),
            (
                "v-5",
                "Cake Baker & Return Gifts",
                "Artisanal Baker & Favor Store",
                8.0,
                14,
                [
                    "Order themed 2-tier chocolate truffle or red velvet cake",
                    "Confirm delivery timing exactly 1 hour before party kicks off",
                    "Pack personalized return gifts (books, DIY craft kits, board games)",
                ],
                "Opt for educational or creative DIY kits as return gifts instead of cheap plastic toys.",
            ),
            (
                "v-6",
                "Photographer",
                "Candid Event Photographer",
                5.0,
                14,
                [
                    "Capture family portraits before guests arrive and cake is cut",
                    "Shoot candid reaction shots of games and laughter",
                    "Request high-res digital gallery within 4 days",
                ],
                "Tell photographer to take candid photos of grandparents and kids interacting together.",
            ),
        ]

    else:  # COMMUNITY
        vendors_data = [
            (
                "v-1",
                "Catering & Mahaprasad",
                "Community Halwai & Bhog Team",
                38.0,
                60,
                [
                    "Calculate dry rations (atta, rice, dal, pure ghee, jaggery)",
                    "Arrange huge degchis, gas burners, and cooking shamiana",
                    "Organize eco-friendly leaf plates (pattals), earthen kulhads, and water dispensers",
                    "Assign volunteer seva shifts for serving food with love and hygiene",
                ],
                "Purchasing grains in bulk from agricultural APMC mandis saves 25-30% compared to retail groceries.",
            ),
            (
                "v-2",
                "Community Hall & Shamiana",
                "Tent & Seating Contractor",
                24.0,
                75,
                [
                    "Erect waterproof shamiana / pandal with side wind curtains",
                    "Lay green carpet/durrie flooring for floor seating",
                    "Set up stage, backdrop, podium, and VIP front chairs",
                    "Arrange pedestal fans / air coolers depending on season",
                ],
                "Always check emergency exit clearance and fire extinguisher placement with the local fire department.",
            ),
            (
                "v-3",
                "Pooja Decor & Garlands",
                "Flower Market Vendor",
                14.0,
                30,
                [
                    "Procure loose marigold (genda) petals for aarti and welcomes",
                    "Order thick floral garlands for idols / stage dignitaries",
                    "Create traditional rice-flour rangoli at the main gate",
                ],
                "Visit local wholesale flower mandis (Phool Mandi) early at 5 AM for fresh flowers at wholesale pricing.",
            ),
            (
                "v-4",
                "Sound System & Electrician",
                "PA Audio Contractor",
                12.0,
                30,
                [
                    "Install 4-6 horn/column speakers spread evenly across the hall",
                    "Provide podium mics, lapel mics for speakers, and instrument mics for bhajan",
                    "Keep a 15kVA diesel generator on standby for power outage protection",
                ],
                "Test mic feedback levels before the gathering arrives to avoid loud screeching during hymns.",
            ),
            (
                "v-5",
                "Priests & Bhajan Troupe",
                "Performers & Religious Scholars",
                7.0,
                40,
                [
                    "Confirm schedule of aarti, havan, pravachan, or kirtan",
                    "Arrange harmonium, dholak, and chimta accompanists",
                    "Prepare stoles, shawls, and floral garlands to felicitate artists",
                ],
                "Provide a quiet rest room with water and snacks for performing artists and priests.",
            ),
            (
                "v-6",
                "Sanitation & Public NOCs",
                "Waste & Security Team",
                5.0,
                25,
                [
                    "Submit intimation letter to local police station and municipal ward",
                    "Deploy marked waste bins for wet food waste and dry packaging",
                    "Keep first aid kit, ORS sachets, and volunteer safety vests ready",
                ],
                "Community cleanliness post-event reflects respect for the locality; arrange prompt waste clearance.",
            ),
        ]

    vendor_items: List[VendorItem] = []

    for vid, cat, vtype, share_pct, default_book_days, tasks, tips in vendors_data:
        amt = round(total_budget * (share_pct / 100.0))
        # book by days is either default or compressed if event is close
        effective_days = min(default_book_days, max(1, days_left - 1)) if days_left > 1 else 0
        book_dt = max(today, event_date - timedelta(days=effective_days))

        vendor_items.append(
            VendorItem(
                id=vid,
                category=cat,
                vendor_type=vtype,
                suggested_share_pct=share_pct,
                suggested_budget=float(amt),
                suggested_budget_formatted=format_inr(amt),
                book_by_date=book_dt.strftime("%Y-%m-%d"),
                book_by_days_before=effective_days,
                checklist_tasks=tasks,
                local_tips=tips,
            )
        )

    return vendor_items


def generate_fallback_ideas(
    event_type: EventType,
    city: str,
    style_notes: str,
    guest_count: int,
    total_budget: float,
    wedding_functions: int = 3,
) -> PersonalizedIdeas:
    """
    Produce culturally authentic, rich Indian ideas without AI calls.
    Ensures 100% resilience if Gemini is unavailable.
    """
    if event_type == EventType.WEDDING:
        return PersonalizedIdeas(
            summary=f"A vibrant {wedding_functions}-function celebration in {city} for {guest_count} guests, blending royal Indian heritage with warm, intimate family hospitality.",
            theme_concept=f"Royal Marigold & Heritage Brass: Timeless traditional aesthetic showcasing {city}'s local artisanal textiles, fragrance of fresh jasmine, and acoustic folk music.",
            menu_highlights=[
                "Live Old Delhi / Chandni Chowk Chaat Counter (Matra Kulcha, Palak Patta Chaat, Dahi Bhalla)",
                "Wood-fired Kulhad Chai with assorted artisanal mathris & hot samosas",
                f"Regional {city} Signature Main Curry (Shahi Paneer / Dal Makhani / Biryani) with tandoori breads",
                "Live Kadhai Jalebi with cold Rabdi & Malai Kulfi sticks for dessert",
            ],
            activities_and_rituals=[
                "Baraat flash mob entry with family sunglasses and live Dhol Tasha beats",
                "Grandparents' blessing corner with vintage photo memory wall",
                "Groom vs Bride Antakshari & Bollywood dance-off during Sangeet night",
                "Customized Mehendi quiz trivia about how the couple first met",
            ],
            decor_palette=[
                "Deep Marigold Yellow (#F5A623)",
                "Heritage Terracotta Red (#C04A26)",
                "Peacock Emerald Green (#125B50)",
                "Warm Antique Gold (#D4AF37)",
            ],
            money_saving_tips=[
                "Repurpose stage florals from the Sangeet to frame the Mandap next morning, saving up to ₹40,000.",
                "Send elegant animated WhatsApp video invitations instead of heavy boxed printed cards for 80% of outstation guests.",
                "Opt for local brass diyas and terracotta urlis with floating candles rather than expensive acrylic imported props.",
            ],
            is_ai_generated=False,
        )

    elif event_type == EventType.BIRTHDAY:
        return PersonalizedIdeas(
            summary=f"An energetic, heartwarming birthday party in {city} designed for {guest_count} guests with engaging interactive games and delicious comfort treats.",
            theme_concept=f"Festive Carnival & Street Treats: A colorful, joy-filled celebration featuring playful carnival stalls, interactive entertainment, and personalized favors.",
            menu_highlights=[
                "Mini Pav Bhaji & Slider burger station with live butter toasting",
                "Make-your-own Pizza slice bar with kid-friendly toppings",
                "Assorted fruit mocktail spritzers in cute customized mason jars",
                "Double Dutch Chocolate Fountain with marshmallows and churros",
            ],
            activities_and_rituals=[
                "Interactive mystery games and musical chair showdown with prizes",
                "DIY pottery or caricature portrait booth for every family to take home",
                "Cake-cutting countdown with confetti poppers and a personalized video clip",
            ],
            decor_palette=[
                "Warm Tangerine Orange (#F77F00)",
                "Cerulean Sky Blue (#0077B6)",
                "Soft Vanilla Cream (#FFF3B0)",
                "Vibrant Mint (#2EC4B6)",
            ],
            money_saving_tips=[
                "Host at a residential clubhouse or community hall to save ₹30,000+ on private cafe minimum-billing charges.",
                "Create a stunning organic balloon garland backdrop using simple DIY balloon arch tape instead of hiring an expensive agency.",
                "Gift potted herb plants or storybooks as return favors that last long and cost 50% less than plastic novelty sets.",
            ],
            is_ai_generated=False,
        )

    else:  # COMMUNITY
        return PersonalizedIdeas(
            summary=f"A spiritually uplifting and unified community gathering in {city} for {guest_count} attendees, centered on devotion, shared seva, and togetherness.",
            theme_concept=f"Vedic Harmony & Satsang: An open, inclusive community atmosphere adorned with banana stalks, auspicious torans, and resonating devotional chants.",
            menu_highlights=[
                "Traditional Satvik Mahaprasad: Pure Desi Ghee Khichdi, Kadhi & seasonal subzi",
                "Warm Boondi Ladoo, Panjiri, and fresh seasonal fruit cuts for Bhog",
                "Cardamom Masala Chai in clay kulhads for evening attendees",
                "Cooling Rose Sharbat and Buttermilk (Chaas) counters",
            ],
            activities_and_rituals=[
                "Community lighting of 108 deepams with Vedic mantra chanting",
                "Bhajan Mandali musical performance with crowd participation and kartals",
                "Voluntary seva teams for prasad distribution and elderly seating assistance",
                "Felicitation of neighborhood seniors and community youth achievers",
            ],
            decor_palette=[
                "Sacred Saffron / Kesari (#FF9933)",
                "Auspicious Kumkum Red (#B22222)",
                "Fresh Banana Leaf Green (#3B7A57)",
                "Pristine White (#FFFFFF)",
            ],
            money_saving_tips=[
                "Procure grains, lentils, and oil directly from wholesale APMC mandis to cut grocery bills by 30%.",
                "Encourage community member families to contribute flowers or dry prasad as voluntary seva offerings.",
                "Use biodegradable dried areca palm leaf plates (pattals) which are cost-effective, culturally authentic, and compostable.",
            ],
            is_ai_generated=False,
        )
