import requests

def filtrera_ravaror():
    print("Hämtar listan...")
    url = "https://dataportal.livsmedelsverket.se/livsmedel/api/v1/livsmedel?limit=5000"
    svar = requests.get(url).json()
    livsmedel = svar.get('livsmedel', [])

    # Behåll BARA de livsmedel som har ett vetenskapligt namn
    ravaror = [mat for mat in livsmedel if mat.get('vetenskapligtNamn')]

    print(f"\n✅ Rensning klar!")
    print(f"Filtrerade bort alla måltider. Kvar finns {len(ravaror)} rena råvaror (av totalt {len(livsmedel)}).")
    print("="*60)
    
    print("Visar de 20 första råvarorna som ett stickprov:\n")
    for mat in ravaror[:20]:
        print(f"- {mat['namn']} (Latinskt namn: {mat['vetenskapligtNamn']})")

if __name__ == "__main__":
    filtrera_ravaror()