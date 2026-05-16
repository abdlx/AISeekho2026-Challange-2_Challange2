import { createAdminClient } from '../lib/supabase-server';

async function seedProviders() {
  console.log('Seeding service providers...');
  const adminClient = createAdminClient();

  const providers = [
    // Islamabad
    { name: 'Ali AC Services',         service_type: 'AC Technician', location: '33.6844, 73.0479', rating: 4.8, is_available: true },
    { name: 'G-13 AC Repair',          service_type: 'AC Technician', location: '33.6500, 73.0200', rating: 4.9, is_available: true },
    { name: 'Blue Area Electrician',   service_type: 'Electrician',   location: '33.7200, 73.0800', rating: 4.4, is_available: true },
    { name: 'F-7 Plumbing',            service_type: 'Plumbing',      location: '33.7100, 73.0600', rating: 4.6, is_available: true },
    { name: 'Hassan Plumbing ISB',     service_type: 'Plumbing',      location: '33.6900, 73.0550', rating: 4.5, is_available: true },
    { name: 'Rawalpindi AC Expert',    service_type: 'AC Technician', location: '33.6007, 73.0679', rating: 4.3, is_available: true },
    { name: 'ISB Handyman Pro',        service_type: 'Plumbing',      location: '33.7200, 73.1000', rating: 4.7, is_available: true },
    { name: 'Islamabad Gas Fitter',    service_type: 'Gas Fitter',    location: '33.6650, 73.0580', rating: 4.5, is_available: true },
    { name: 'F-10 Electrician',        service_type: 'Electrician',   location: '33.7060, 73.0330', rating: 4.6, is_available: true },

    // Karachi
    { name: 'Nazimabad Plumbers',      service_type: 'Plumbing',      location: '24.9200, 67.0300', rating: 4.6, is_available: true },
    { name: 'DHA AC Services',         service_type: 'AC Technician', location: '24.8200, 67.0700', rating: 4.7, is_available: true },
    { name: 'Gulshan Electrician',     service_type: 'Electrician',   location: '24.9500, 67.0800', rating: 4.3, is_available: true },
    { name: 'Clifton Handyman',        service_type: 'AC Technician', location: '24.8100, 67.0300', rating: 4.8, is_available: true },
    { name: 'PECHS Plumbing',          service_type: 'Plumbing',      location: '24.8700, 67.0600', rating: 4.5, is_available: true },
    { name: 'North Karachi AC Fix',    service_type: 'AC Technician', location: '24.9800, 67.0600', rating: 4.4, is_available: true },
    { name: 'Saddar Electricians',     service_type: 'Electrician',   location: '24.8609, 67.0104', rating: 4.5, is_available: true },
    { name: 'Korangi Plumber Co',      service_type: 'Plumbing',      location: '24.8330, 67.1150', rating: 4.3, is_available: true },
    { name: 'Malir Gas Services',      service_type: 'Gas Fitter',    location: '24.8950, 67.1800', rating: 4.2, is_available: true },
    { name: 'FB Area Handyman',        service_type: 'Plumbing',      location: '24.9650, 67.0750', rating: 4.6, is_available: true },

    // Lahore
    { name: 'DHA Lahore Electric',     service_type: 'Electrician',   location: '31.4800, 74.4000', rating: 4.6, is_available: true },
    { name: 'Gulberg AC Repair',       service_type: 'AC Technician', location: '31.5100, 74.3500', rating: 4.7, is_available: true },
    { name: 'Model Town Plumber',      service_type: 'Plumbing',      location: '31.4900, 74.3200', rating: 4.5, is_available: true },
    { name: 'Johar Town Handyman',     service_type: 'AC Technician', location: '31.4600, 74.2800', rating: 4.4, is_available: true },
    { name: 'Bahria Electrician',      service_type: 'Electrician',   location: '31.3700, 73.9800', rating: 4.8, is_available: true },
    { name: 'Garden Town Plumbing',    service_type: 'Plumbing',      location: '31.5200, 74.3200', rating: 4.6, is_available: true },
    { name: 'Allama Iqbal AC',         service_type: 'AC Technician', location: '31.5400, 74.4100', rating: 4.5, is_available: true },
    { name: 'Lahore Cantonment Fix',   service_type: 'Electrician',   location: '31.5550, 74.3900', rating: 4.7, is_available: true },
    { name: 'Faisal Town Gas Fitter',  service_type: 'Gas Fitter',    location: '31.4700, 74.3150', rating: 4.4, is_available: true },
  ];

  const { data, error } = await adminClient
    .from('service_providers')
    .insert(providers)
    .select();

  if (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Seeded ${data?.length ?? 0} providers successfully.`);
  console.log('Coverage: Islamabad (9), Karachi (10), Lahore (9)');
}

seedProviders().catch(console.error);
