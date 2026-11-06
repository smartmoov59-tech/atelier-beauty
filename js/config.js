/* ==========================================================================
   ATELIER BEAUTY — données du commerce (seul fichier à modifier pour mettre
   à jour téléphone, horaires, tarifs, canaux de réservation).
   Sources : fiche Google Maps + page Facebook du salon (novembre 2026).
   ========================================================================== */
window.ATELIER = {
  name: 'Atelier Beauty',

  /* Téléphone (numéro fixe : 04 92 36 05 57) */
  phone: '04 92 36 05 57',
  phoneTel: '+33492360557',

  /* Canaux de réservation SANS service payant ni back-end.
     - messenger : page Facebook du salon (ouverture de Messenger)
     - sms       : à renseigner avec un numéro de MOBILE (ex. '+33612345678').
                   Le numéro actuel est un fixe : les SMS n'y arrivent pas,
                   donc le bouton SMS reste caché tant que ce champ est vide.
     - email     : à renseigner si le salon veut recevoir les demandes par mail. */
  messenger: 'https://m.me/61560611420649',
  facebook: 'https://www.facebook.com/p/Atelier-Beauty-61560611420649/',
  sms: '',
  email: '',

  /* Adresse + liens Google Maps */
  address: {
    street: '10 Place Général de Gaulle',
    zip: '04000',
    city: 'Digne-les-Bains',
    lat: 44.0925135,
    lng: 6.2353705
  },
  mapsUrl: 'https://www.google.com/maps/place/Atelier+Beauty/@44.0925135,6.2353705,17z/data=!4m6!3m5!1s0x12cb9b8d765c6755:0xb30f8748c2ffd409!8m2!3d44.0925135!4d6.2353705!16s%2Fg%2F11y4n51hp7',

  /* Horaires d'ouverture : 0 = dimanche … 6 = samedi  ([ouverture, fermeture]) */
  hours: {
    0: null,
    1: ['09:30', '17:30'],
    2: ['09:30', '17:30'],
    3: ['09:30', '17:30'],
    4: ['09:30', '17:30'],
    5: ['09:30', '17:30'],
    6: ['09:30', '17:30']
  },

  /* Jours fériés / fermetures exceptionnelles (AAAA-MM-JJ) : grisés dans le
     calendrier de réservation. À compléter avec les vraies dates de fermeture. */
  closedDates: ['2026-11-11', '2026-12-25', '2027-01-01'],

  /* Créneaux proposés dans le formulaire (heure de début souhaitée) */
  slots: { first: '09:30', last: '16:30', stepMinutes: 30 },
  horizonDays: 28,       // nombre de jours proposés à partir d'aujourd'hui
  minLeadHours: 3,       // délai minimum avant un rendez-vous le jour même

  /* Prestations. Aucun tarif n'est publié en ligne par le salon : laisser
     price à null = affichage « Tarif sur demande ». Pour afficher un prix :
     price: 'à partir de 45 €'  (texte libre).
     durationMin : durée INDICATIVE (par défaut 60 min) utilisée uniquement
     pour le bloc du fichier agenda .ics ; à ajuster selon la vraie durée. */
  services: [
    { id: 'extensions',   name: 'Extensions de cils',      price: null, durationMin: 60 },
    { id: 'rehaussement', name: 'Rehaussement de cils',    price: null, durationMin: 60 },
    { id: 'browlift',     name: 'Browlift (sourcils)',     price: null, durationMin: 60 },
    { id: 'ongles',       name: 'Ongles · manucure & prothésie', price: null, durationMin: 60 },
    { id: 'conseil',      name: 'Je ne sais pas encore : conseillez-moi', price: null, durationMin: 30 }
  ]
};
