import requests
import json
import os

def add_milk_to_dbs():
    # De ID:n du vill lägga till
    milk_ids = [119, 121, 123, 124, 150]
    base_url = "https://dataportal.livsmedelsverket.se/livsmedel/api/v1/livsmedel"
    
    # Exakt de nycklar vi definierade i ALL_MICROS i din diet.js, plus makros
    nutrients_to_keep = [
        "protein", "kolhydrater, tillgängliga", "fett, totalt", "energi (kcal)",
        "vitamin c", "vitamin d", "vitamin e", "vitamin b6", "vitamin b12",
        "folat, totalt", "järn, fe", "kalcium, ca", "zink, zn", "magnesium, mg",
        "kalium, k", "fosfor, p", "selen, se", "jod, i", "fiber",
        "tiamin", "riboflavin", "niacin", "vitamin a", "natrium, na",
        "salt, nacl", "sockerarter, totalt", "summa mättade fettsyror", 
        "summa enkelomättade fettsyror", "summa fleromättade fettsyror", "kolesterol"
    ]

    print("1. Laddar ner mjölkdata från API...")
    new_local_items = []
    new_diet_items = {}

    for mid in milk_ids:
        info_res = requests.get(f"{base_url}/{mid}")
        nut_res = requests.get(f"{base_url}/{mid}/naringsvarden")
        
        if not info_res.ok or not nut_res.ok:
            print(f"❌ Kunde inte hämta ID {mid}")
            continue
            
        namn = info_res.json().get("namn", f"Mjölk {mid}")
        nutrients = nut_res.json()
        
        # Plocka bara de värden vi vill ha
        food_nutrients = {}
        for n in nutrients:
            n_namn = n.get("namn", "").lower()
            if n_namn in nutrients_to_keep:
                val_str = str(n.get("varde", "0")).replace(',', '.')
                try:
                    food_nutrients[n_namn] = float(val_str)
                except ValueError:
                    food_nutrients[n_namn] = 0.0
        
        # Makros till den lätta sök-databasen
        p = food_nutrients.get("protein", 0.0)
        c = food_nutrients.get("kolhydrater, tillgängliga", 0.0)
        f = food_nutrients.get("fett, totalt", 0.0)
        kcal = food_nutrients.get("energi (kcal)", 0.0)

        new_local_items.append({
            "id": mid,
            "name": namn,
            "main_category": "Övrigt",
            "p": p,
            "c": c,
            "f": f,
            "kcal": kcal
        })

        # Hela profilen till den tunga databasen
        new_diet_items[str(mid)] = {
            "name": namn,
            "main_category": "Övrigt",
            "nutrients": food_nutrients
        }
        print(f"✅ Laddade ner: {namn}")

    # --- UPPDATERA js/database.js ---
    print("\n2. Uppdaterar js/database.js...")
    db_path = "js/database.js"
    if os.path.exists(db_path):
        with open(db_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        start_idx = content.find("[")
        end_idx = content.rfind("]") + 1
        
        if start_idx != -1 and end_idx != -1:
            json_str = content[start_idx:end_idx]
            local_db = json.loads(json_str)
            
            # Ta bort ifall vi råkar köra skriptet 2 gånger (förhindrar dubbletter)
            local_db = [item for item in local_db if item["id"] not in milk_ids]
            local_db.extend(new_local_items)
            
            new_content = content[:start_idx] + json.dumps(local_db, ensure_ascii=False, indent=2) + content[end_idx:]
            
            with open(db_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print("✅ js/database.js är uppdaterad!")
        else:
            print("❌ Kunde inte parsa js/database.js")
    
    # --- UPPDATERA diet_database.json ---
    print("3. Uppdaterar diet_database.json...")
    diet_path = "diet_database.json"
    if os.path.exists(diet_path):
        with open(diet_path, "r", encoding="utf-8") as f:
            diet_db = json.load(f)
        
        diet_db.update(new_diet_items)
        
        with open(diet_path, "w", encoding="utf-8") as f:
            json.dump(diet_db, f, ensure_ascii=False, indent=2)
        print("✅ diet_database.json är uppdaterad!")
        
    print("\n🎉 Klart! Gå till webbläsaren och tryck Ctrl + F5.")

if __name__ == "__main__":
    add_milk_to_dbs()