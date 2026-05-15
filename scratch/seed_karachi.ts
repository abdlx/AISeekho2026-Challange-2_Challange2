import { createAdminClient } from '../src/lib/supabase-server';

async function seedKarachiData() {
  console.log('Seeding Karachi providers...');
  
  const providers = [
    {
      name: 'Nazimabad Plumbing Solutions',
      service_type: 'Plumber',
      location: '24.9142, 67.0319', // Nazimabad No. 3, Karachi
      rating: 4.7,
      hourly_rate_pkr: 1500,
      is_available: true
    },
    {
      name: 'Karachi AC Master',
      service_type: 'AC Technician',
      location: '24.9200, 67.0400', // North Nazimabad
      rating: 4.9,
      hourly_rate_pkr: 3000,
      is_available: true
    }
  ];

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('service_providers')
    .insert(providers);

  if (error) {
    console.error('Error seeding data:', error);
  } else {
    console.log('Successfully added Karachi providers!');
  }
}

seedKarachiData();
