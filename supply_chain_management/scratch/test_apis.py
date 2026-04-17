import yfinance as yf
import requests

def test_weather():
    url = "https://api.open-meteo.com/v1/forecast?latitude=1.2641&longitude=103.8230&current=temperature_2m,wind_speed_10m,weather_code"
    r = requests.get(url)
    data = r.json()
    print("Weather Singapore:", data['current'])

def test_fuel():
    # CL=F is Crude Oil Futures on Yahoo
    oil = yf.Ticker("CL=F")
    price = oil.fast_info['last_price']
    print("Oil Price (WTI):", price)

if __name__ == "__main__":
    try:
        test_weather()
    except Exception as e:
        print("Weather failed:", e)
        
    try:
        test_fuel()
    except Exception as e:
        print("Fuel failed:", e)
