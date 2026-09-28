/* A curated place index from the supplied draft itinerary. No bookings, dates,
   contact details, medical notes, or diary material are included in public code. */
(() => {
  const route = {
    "Africa": {
      "Kenya": "Nairobi",
      "Uganda": "Uganda",
      "Rwanda": "Rwanda",
      "Tanzania": "Tanzania|Zanzibar",
      "Malawi": "Malawi",
      "Zambia": "Zambia",
      "Zimbabwe": "Zimbabwe",
      "Botswana": "Botswana",
      "Namibia": "Namibia",
      "South Africa": "Cape Town"
    },
    "The Americas": {
      "Mexico": "Mexico City|Oaxaca|Playa del Carmen",
      "Belize": "Belize",
      "Guatemala": "Antigua|Lake Atitlán",
      "El Salvador": "Santa Ana|San Salvador",
      "Honduras": "Copán",
      "Nicaragua": "Nicaragua",
      "Costa Rica": "San José|Puerto Viejo",
      "Panama": "Bocas del Toro|Panama City",
      "Colombia": "Cartagena|Medellín|Bogotá",
      "Brazil": "Manaus|Salvador|São Paulo|Iguaçu Falls|Rio de Janeiro",
      "Paraguay": "Ciudad del Este",
      "Uruguay": "Montevideo|Colonia del Sacramento",
      "Argentina": "Buenos Aires",
      "Chile": "Santiago|Valparaíso|San Pedro de Atacama|Patagonia",
      "Bolivia": "Uyuni|La Paz",
      "Peru": "Cusco|Arequipa|Huacachina|Paracas|Lima"
    },
    "Europe": {
      "Sweden": "Stockholm",
      "Finland": "Helsinki",
      "Estonia": "Tallinn",
      "Latvia": "Riga",
      "Lithuania": "Vilnius|Trakai",
      "Poland": "Warsaw|Kraków",
      "Czechia": "Prague",
      "Slovakia": "Bratislava|Poprad|Košice",
      "Moldova": "Chișinău",
      "Romania": "Bucharest|Sibiu|Sighișoara|Cluj-Napoca",
      "Hungary": "Budapest|Pécs",
      "Slovenia": "Ljubljana|Bled|Lake Bohinj|Soča Valley|Piran",
      "Croatia": "Zagreb|Split|Dubrovnik|Korčula",
      "Bosnia and Herzegovina": "Mostar|Sarajevo",
      "Montenegro": "Kotor|Budva",
      "Serbia": "Belgrade",
      "Kosovo": "Pristina",
      "North Macedonia": "Skopje",
      "Albania": "Tirana",
      "Greece": "Athens|Santorini|Crete",
      "Cyprus": "Larnaca|Nicosia|Paphos",
      "Bulgaria": "Sofia|Plovdiv"
    },
    "Caucasus": {
      "Turkey": "Istanbul|Izmir|Antalya|Cappadocia",
      "Azerbaijan": "Baku|Sheki",
      "Georgia": "Tbilisi|Kazbegi",
      "Armenia": "Yerevan|Dilijan|Tatev"
    },
    "Southeast Asia": {
      "Indonesia": "Jakarta|Yogyakarta|Malang|Uluwatu|Ubud|Munduk",
      "Brunei": "Bandar Seri Begawan",
      "Singapore": "Singapore",
      "Malaysia": "Kuala Lumpur|Cameron Highlands|Penang",
      "Thailand": "Bangkok|Chiang Mai",
      "Myanmar": "Yangon|Mandalay",
      "Cambodia": "Siem Reap|Phnom Penh",
      "Vietnam": "Ho Chi Minh City|Hoi An|Da Nang|Hanoi",
      "Laos": "Vientiane|Vang Vieng|Luang Prabang",
      "Philippines": "Boracay|Palawan|Cebu|Manila"
    },
    "East Asia": {
      "Taiwan": "Taipei|Jiufen|Hualien|Kaohsiung|Tainan|Alishan|Sun Moon Lake",
      "Hong Kong": "Hong Kong",
      "China": "Shenzhen|Guangzhou|Beijing|Datong|Pingyao|Shanghai|Suzhou|Hangzhou|Huangshan|Guilin|Yangshuo|Chengdu|Leshan|Lijiang|Dali|Kunming|Xi'an|Xining|Turpan|Ürümqi|Kashgar"
    },
    "Silk Road": {
      "Kazakhstan": "Almaty|Astana",
      "Kyrgyzstan": "Bishkek|Osh|Issyk-Kul",
      "Tajikistan": "Khorog|Dushanbe",
      "Uzbekistan": "Samarkand|Bukhara|Khiva|Tashkent",
      "Turkmenistan": "Ashgabat|Darvaza"
    }
  };

  const slug = value => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const places = Object.entries(route).flatMap(([region, countries]) =>
    Object.entries(countries).flatMap(([country, cities]) =>
      cities.split("|").map(city => ({ id: `${slug(region)}-${slug(country)}-${slug(city)}`, region, country, city }))
    )
  );

  const stories = {
    "Yerevan": {
      scene: "mountain", title: "The light on the steps",
      intro: "At the foot of a long staircase, a small guild lantern has gone dark. The What-If whispers that taking the wrong step will spoil the whole climb. Three sun petals are caught in the evening breeze.",
      choices: [
        ["Climb one step", "You climb. The lantern catches a little light. You cannot see the whole staircase, but you can see the next step."],
        ["Ask your friend", "Your companion walks beside you. Sharing the climb changes its shape; it was never a test you had to pass alone."],
        ["Sit and watch", "You sit long enough to notice the sunset reaching the steps. Rest has revealed a path you could not see while rushing."]
      ], prompt: "What did you notice here that you might otherwise have missed?"
    },
    "Tbilisi": {
      scene: "mountain", title: "The bridge of little lights",
      intro: "The river has carried three bright petals away from the guild's old bridge. Catch them before twilight; the bridge remembers every traveller who crossed it.",
      choices: [["Follow the river", "You find a way through the winding streets, and a new view opens ahead."],["Call your friend over", "A second pair of eyes spots the light caught below the bridge."],["Pause at the shore", "When you stop chasing it, one petal floats gently into reach."]],
      prompt: "What moment from this place would you put in a little glass bottle?"
    },
    "Baku": {
      scene: "coast", title: "Fire by the sea",
      intro: "An orange flame flickers along the promenade, but the wind scatters its three petals. Your guild needs them to light the way across the water.",
      choices: [["Shelter the flame", "Your hands make a small refuge for the light."],["Ask for a lantern", "Your companion offers theirs. Together, the flame holds steady."],["Walk with the wind", "You turn with the wind and discover another way to carry it."]],
      prompt: "What did this city feel like after dark?"
    },
    "Cappadocia": {
      scene: "balloons", title: "A sky full of maybes",
      intro: "At dawn, the valley fills with floating lanterns. The What-If insists there is only one perfect direction. Three petals drift across the sky, each towards a different horizon.",
      choices: [["Follow the first light", "The nearest lantern leads to a lovely view you did not plan for."],["Compare the paths", "Your companion helps you choose, and the other horizons remain beautiful."],["Stay for sunrise", "The sky changes while you wait. A new route appears in the morning light."]],
      prompt: "What did the morning sky make you think of?"
    },
    "Rio de Janeiro": {
      scene: "coast", title: "A birthday in the sun",
      intro: "Music reaches the guild from beyond the shore. The sunflowers need three bright petals before the celebration can begin. There is room here for joy and for quiet, too.",
      choices: [["Join the music", "You let the rhythm carry you for a while."],["Find a quiet view", "From the edge of the crowd, the colours are every bit as vivid."],["Bring your companion", "They make space beside you, and the celebration feels a little more yours."]],
      prompt: "What part of this day would you like to keep?"
    },
    "Ubud": {
      scene: "terraces", title: "The patient little light",
      intro: "A lantern rests above a green valley. Its petals have settled in three different corners of the landscape. The guild will follow the trail at your pace.",
      choices: [["Take the winding trail", "One bend reveals a view that the straight path missed."],["Let your friend lead", "Following for a while is its own kind of choice."],["Listen to the rain", "The sound gives you a moment to settle before you go on."]],
      prompt: "What colours and sounds do you remember from here?"
    },
    "Hoi An": {
      scene: "lanterns", title: "Lanterns on the water",
      intro: "Night falls and the guild's lanterns begin to glow. Three sun petals have slipped among their reflections. Find them, then decide where to carry your light.",
      choices: [["Follow the reflections", "Every ripple changes the picture; the light stays with you."],["Walk with your friend", "The streets feel different when a story is shared."],["Write it down", "You save a detail before the evening passes. The lantern glows brighter."]],
      prompt: "Which little detail of the evening deserves a diary page?"
    },
    "Luang Prabang": {
      scene: "river", title: "Where two rivers meet",
      intro: "At the meeting of two rivers, the guild finds a lantern waiting for three lost petals. The What-If asks which way is the correct one. The river keeps moving.",
      choices: [["Explore the riverbank", "You take a path and find something unexpected."],["Ask your companion", "They listen before answering. That helps more than a perfect direction."],["Stay a little longer", "You are allowed to be here without solving anything first."]],
      prompt: "What would you tell someone who had never seen this place?"
    },
    "Beijing": {
      scene: "rooftops", title: "A lantern for another year",
      intro: "The city glows under a winter sky. Three petals have landed among the lanterns, and the guild has a place at the table for you whenever you return.",
      choices: [["Follow the music", "You arrive at a courtyard filled with warmth."],["Bring someone along", "Your companion remembers a story you told them much earlier."],["Choose a quiet path", "The city is still beautiful when you make room for your own pace."]],
      prompt: "What would you like your future self to remember from today?"
    },
    "Taipei": {
      scene: "rooftops", title: "The night market constellation",
      intro: "Three petals gleam like tiny stars among the market lights. Your companion wants to make a map of the best discoveries, including the unplanned ones.",
      choices: [["Take a new turn", "The lane opens onto a little surprise."],["Share a favourite", "Your companion adds it to the map with a careful star."],["Watch for a while", "The scene becomes a memory before you even move."]],
      prompt: "What smell, sound, or taste belongs on this page?"
    },
    "Istanbul": {
      scene: "coast", title: "Across the water",
      intro: "On the ferry, three sun petals drift past the guild's window. Beyond the water are many streets to wander. You only need to choose one for now.",
      choices: [["Cross towards the market", "A winding street leads to something wonderful."],["Ask your companion", "They point out a detail you would have missed."],["Stay for the view", "The crossing becomes part of the adventure, not just a way through it."]],
      prompt: "What view would you want to see again?"
    },
    "Cusco": {
      scene: "mountain", title: "The high path",
      intro: "The path rises toward the mountains. Three glowing petals mark a gentle route, and the guild reminds you that a slower pace is still a way forward.",
      choices: [["Take the next step", "The mountain does not ask you to see the summit from here."],["Walk together", "Your companion matches your pace without a word."],["Rest and look around", "You find a view worth stopping for."]],
      prompt: "What did the landscape make you feel?"
    }
  };

  window.SUNFLOWER_DATA = { places, stories, regions: Object.keys(route) };
})();
