const MOTOS = [
  { id: 1, name: "Honda Vision 110", brand: "Honda", category: "Scooter", img: "https://images.unsplash.com/photo-1572195577046-2f25894c06fc?w=800&q=80", price: 35, specs: { power: "8.6 HP", seats: "2", engine: "109cc", type: "Automatique" }, status: "available", rating: 4.7 },
  { id: 2, name: "Yamaha NMAX 125", brand: "Yamaha", category: "Scooter", img: "https://images.unsplash.com/photo-1610478920409-ec0f58e881a5?w=800&q=80", price: 45, specs: { power: "12 HP", seats: "2", engine: "125cc", type: "Automatique" }, status: "available", rating: 4.8 },
  { id: 3, name: "Piaggio Zip 100", brand: "Piaggio", category: "Scooter", img: "https://images.unsplash.com/photo-1751193931940-15fea2fe0dff?w=800&q=80", price: 28, specs: { power: "6 HP", seats: "2", engine: "100cc", type: "Automatique" }, status: "available", rating: 4.5 },
  { id: 4, name: "Honda Click 125i", brand: "Honda", category: "Scooter", img: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80", price: 40, specs: { power: "11 HP", seats: "2", engine: "125cc", type: "Automatique" }, status: "available", rating: 4.6 },
  { id: 5, name: "SYM Maxsym 400", brand: "SYM", category: "Maxi-Scooter", img: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80", price: 60, specs: { power: "33 HP", seats: "2", engine: "400cc", type: "Automatique" }, status: "available", rating: 4.9 },
  { id: 6, name: "Kymco Agility 125", brand: "Kymco", category: "Scooter", img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80", price: 30, specs: { power: "8.5 HP", seats: "2", engine: "125cc", type: "Automatique" }, status: "rented", rating: 4.4 }
];

const RESTAURANTS = [
  { id: 1, name: "Le Pirate Restaurant", category: "Restaurant", lat: 36.4560, lng: 10.7350, img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80", rating: 4.6, description: "Cuisine tunisienne et mediterraneenne, vue mer", price: "$$", phone: "+216 72 280 123" },
  { id: 2, name: "Cafe des Nattes", category: "Cafe", lat: 36.4580, lng: 10.7320, img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80", rating: 4.3, description: "Cafe traditionnel, atmosphere authentique", price: "$", phone: "+216 72 280 456" },
  { id: 3, name: "Restaurant La Plage", category: "Restaurant", lat: 36.4530, lng: 10.7380, img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80", rating: 4.7, description: "Fruits de mer frais, plage privee", price: "$$$", phone: "+216 72 280 789" },
  { id: 4, name: "Chez Ali", category: "Restaurant", lat: 36.4600, lng: 10.7300, img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80", rating: 4.4, description: "Cuisine traditionnelle, couscous et grillades", price: "$$", phone: "+216 72 280 321" },
  { id: 5, name: "Sunset Cafe", category: "Cafe", lat: 36.4545, lng: 10.7365, img: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80", rating: 4.5, description: "Cafe face a la mer, couchers de soleil", price: "$", phone: "+216 72 280 654" },
  { id: 6, name: "Pizzeria Napoli", category: "Restaurant", lat: 36.4575, lng: 10.7340, img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80", rating: 4.2, description: "Pizza authentique au four a bois", price: "$$", phone: "+216 72 280 987" },
  { id: 7, name: "Le Cap Nabeul", category: "Restaurant", lat: 36.4590, lng: 10.7310, img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80", rating: 4.8, description: "Restaurant gastronomique, vue panoramique", price: "$$$", phone: "+216 72 280 147" },
  { id: 8, name: "Marche de Nabeul", category: "Point d'interet", lat: 36.4555, lng: 10.7330, img: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&q=80", rating: 4.6, description: "Grand marche, artisat et epices", price: "", phone: "" }
];

const PLANS = [
  { name: "Essentiel", price: 29, period: "mois", features: ["3 locations/mois", "Scooters standard", "Support email", "Annulation gratuite 24h"] },
  { name: "Premium", price: 59, period: "mois", popular: true, features: ["Locations illimitees", "Tous les scooters", "Support prioritaire", "Annulation gratuite 48h", "Casque offert"] },
  { name: "VIP", price: 99, period: "mois", features: ["Locations illimitees", "Scooters premium exclusifs", "Support 24/7", "Annulation flexible", "Casque + sac de livraison", "Livraison a l'hotel"] }
];
