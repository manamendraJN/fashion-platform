from config import (
    COLOR_COMPAT, OCCASION_PREFERRED_CATS, OCCASION_EXCLUDED_CATS,
    NECKLINE_ACC_GUIDE, SLEEVE_ACC_GUIDE, SEASON_COMPAT, RELIGION_PREFS,
)


def explain_recommendation(acc: dict, dress_attrs: dict,
                            occasion: str, gender: str,
                            religion: str, budget: float) -> dict:
    reasons  = []
    warnings = []

    cat       = acc.get("category", "")
    acc_color = acc.get("mapped_color", acc.get("color", acc.get("baseColour", "")))
    d_color   = dress_attrs.get("color", "")
    d_season  = dress_attrs.get("season", "")
    neckline  = dress_attrs.get("neckline", "")
    sleeve    = dress_attrs.get("sleeve_length", "")
    usage_cnt = int(acc.get("usage_count", 0))

    if acc_color in COLOR_COMPAT.get(d_color, []):
        reasons.append(f"{acc_color} perfectly complements your {d_color} outfit")
    elif acc_color in ["Gold", "Silver", "Metallic"]:
        reasons.append(f"{acc_color} is a universal metallic that pairs with almost any outfit")

    if cat in OCCASION_PREFERRED_CATS.get(occasion, []):
        reasons.append(f"Ideal category for a {occasion} occasion")

    neck_guide = NECKLINE_ACC_GUIDE.get(neckline, {})
    if cat in neck_guide.get("best", []):
        reasons.append(f"Recommended with a {neckline} neckline")
    if cat in neck_guide.get("avoid", []):
        warnings.append(f"Usually avoided with {neckline} — consider carefully")

    sleeve_guide = SLEEVE_ACC_GUIDE.get(sleeve, {})
    if cat in sleeve_guide.get("best", []):
        reasons.append(f"Great choice for {sleeve} attire")

    if acc.get("season") in SEASON_COMPAT.get(d_season, []):
        reasons.append(f"Season-appropriate for {d_season}")

    if cat in RELIGION_PREFS.get(religion, {}).get("preferred_categories", []):
        reasons.append(f"A traditional favourite for {religion} occasions")

    if usage_cnt == 0:
        reasons.append("Brand new — you haven't worn this yet!")
    elif usage_cnt <= 2:
        reasons.append(f"Only worn {usage_cnt} time(s) — good for rotation")

    if not reasons:
        reasons.append(f"Good match for your {occasion} look")

    return {
        "reasons":  reasons,
        "warnings": warnings,
        "summary":  " • ".join(reasons[:2]),
    }


def generate_chat_response(user_msg: str, context: dict) -> str:
    msg   = user_msg.lower().strip()
    occ   = context.get("occasion", "")
    gen   = context.get("gender",   "")
    rel   = context.get("religion", "None")
    bud   = float(context.get("budget", 5000))
    dress = context.get("dress_attributes", {})
    item  = context.get("selected_item", {})

    if any(w in msg for w in ["why", "reason", "explain", "how", "kelak", "kiyanna"]):
        expl = explain_recommendation(item, dress, occ, gen, rel, bud)
        resp = f"**Why {item.get('name', 'this item')}?**\n\n"
        for r in expl["reasons"]:
            resp += f"• {r}\n"
        if expl["warnings"]:
            resp += f"\n⚠️ Note: {expl['warnings'][0]}"
        return resp

    if any(w in msg for w in ["alternative", "another", "market", "buy", "where",
                               "shop", "daraz", "unavailable", "not available", "cannot find"]):
        cat    = item.get("category", "Accessories")
        color  = item.get("color", "")
        q      = f"{cat} {color} {occ}".replace("&", "and")
        url    = f"https://www.daraz.lk/catalog/?q={q.replace(' ', '+')}&price=0-{int(bud)}"
        compat = ", ".join(COLOR_COMPAT.get(dress.get("color", ""), [])[:3])
        return (f"Looking for a **{cat}** within Rs. {bud:,.0f}?\n\n"
                f"👉 Search on Daraz: {url}\n\n"
                f"**Color tip:** Look for {compat} options to match your {dress.get('color', '')} dress.")

    if any(w in msg for w in ["occasion", "what should", "suitable", "appropriate",
                               "recommend for", "suggest"]):
        pref = OCCASION_PREFERRED_CATS.get(occ, [])
        excl = OCCASION_EXCLUDED_CATS.get(occ, [])
        return (f"**For {occ}:**\n\n"
                f"✅ Best categories: {', '.join(pref)}\n"
                + (f"❌ Avoid: {', '.join(excl)}\n" if excl else "")
                + f"\n**Color tip:** With your {dress.get('color', '')} dress, look for "
                + ", ".join(COLOR_COMPAT.get(dress.get("color", ""), ["Gold", "Silver"])[:4]))

    if any(w in msg for w in ["style", "tip", "advice", "neckline", "sleeve"]):
        neck   = dress.get("neckline", "")
        sleeve = dress.get("sleeve_length", "")
        ng     = NECKLINE_ACC_GUIDE.get(neck, {})
        sg     = SLEEVE_ACC_GUIDE.get(sleeve, {})
        resp   = "**Style tips for your dress:**\n\n"
        if neck:
            resp += f"👗 Neckline ({neck}): Best with {', '.join(ng.get('best', [])[:3])}"
            if ng.get("avoid"):
                resp += f" | Avoid: {', '.join(ng['avoid'])}"
            resp += "\n"
        if sleeve:
            resp += f"💪 Sleeves ({sleeve}): Best with {', '.join(sg.get('best', [])[:3])}\n"
        resp += f"\n🎨 Color ({dress.get('color', '')}): Pair with "
        resp += ", ".join(COLOR_COMPAT.get(dress.get("color", ""), [])[:4])
        return resp

    if any(w in msg for w in ["budget", "price", "cost", "rs", "expensive", "afford"]):
        return (f"Your budget is **Rs. {bud:,.0f}**.\n\n"
                f"Tip: Gold and Silver accessories offer great value for {occ} occasions.\n"
                f"Check Daraz for options within your budget.")

    pref = OCCASION_PREFERRED_CATS.get(occ, [])
    return (f"For your **{occ}** look, focus on: {', '.join(pref[:3])}.\n\n"
            f"Ask me why any item was recommended, style tips, or where to buy alternatives!")
