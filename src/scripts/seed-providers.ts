import { createAdminClient } from '../lib/supabase-server';

async function seedProviders() {
  console.log('Seeding service providers...');
  const adminClient = createAdminClient();

  const providers = [
    // ISLAMABAD - G-13, F-7, Blue Area, F-10
    { name: 'Ali AC Expert',           service_type: 'AC Technician', location: '33.6844, 73.0479', rating: 4.8, is_available: true },
    { name: 'G-13 Quick Repair',       service_type: 'AC Technician', location: '33.6500, 73.0200', rating: 4.9, is_available: true },
    { name: 'Pindi Cooling Services',  service_type: 'AC Technician', location: '33.6007, 73.0679', rating: 4.3, is_available: true },
    { name: 'Blue Area Electric Co',   service_type: 'Electrician',   location: '33.7200, 73.0800', rating: 4.4, is_available: true },
    { name: 'F-10 Wiring Specialists', service_type: 'Electrician',   location: '33.7060, 73.0330', rating: 4.6, is_available: true },
    { name: 'Islamabad Power Fix',     service_type: 'Electrician',   location: '33.6750, 73.0550', rating: 4.5, is_available: true },
    { name: 'F-7 Premium Plumbing',    service_type: 'Plumbing',      location: '33.7100, 73.0600', rating: 4.6, is_available: true },
    { name: 'Hassan Master Plumber',   service_type: 'Plumbing',      location: '33.6900, 73.0550', rating: 4.5, is_available: true },
    { name: 'ISB Handyman Solutions',  service_type: 'Plumbing',      location: '33.7200, 73.1000', rating: 4.7, is_available: true },
    { name: 'Islamabad Gas Fitters',   service_type: 'Gas Fitter',    location: '33.6650, 73.0580', rating: 4.5, is_available: true },
    { name: 'F-6 Gas Installation',    service_type: 'Gas Fitter',    location: '33.7340, 73.0410', rating: 4.4, is_available: true },

    // KARACHI - Nazimabad, DHA, Gulshan, Clifton, PECHS, Saddar
    { name: 'Nazimabad Plumbing Hub',  service_type: 'Plumbing',      location: '24.9200, 67.0300', rating: 4.6, is_available: true },
    { name: 'Pindi Repairs',           service_type: 'AC Technician', location: '33.6420, 73.0800', rating: 4.2, is_available: true },
    { name: 'DHA Cool Tech',           service_type: 'AC Technician', location: '24.8200, 67.0700', rating: 4.7, is_available: true },
    { name: 'Gulshan Electric Masters',service_type: 'Electrician',   location: '24.9500, 67.0800', rating: 4.3, is_available: true },
    { name: 'Clifton Air Solutions',   service_type: 'AC Technician', location: '24.8100, 67.0300', rating: 4.8, is_available: true },
    { name: 'PECHS Pipe Works',        service_type: 'Plumbing',      location: '24.8700, 67.0600', rating: 4.5, is_available: true },
    { name: 'Saddar Electrical Fix',   service_type: 'Electrician',   location: '24.8609, 67.0104', rating: 4.5, is_available: true },
    { name: 'North Karachi AC Pro',    service_type: 'AC Technician', location: '24.9800, 67.0600', rating: 4.4, is_available: true },
    { name: 'Korangi Plumber Expert',  service_type: 'Plumbing',      location: '24.8330, 67.1150', rating: 4.3, is_available: true },
    { name: 'Karachi Gas Safety',      service_type: 'Gas Fitter',    location: '24.8950, 67.1800', rating: 4.2, is_available: true },
    { name: 'FB Area Services',        service_type: 'Plumbing',      location: '24.9650, 67.0750', rating: 4.6, is_available: true },
    { name: 'Liaquatabad Electrician', service_type: 'Electrician',   location: '24.9050, 67.0950', rating: 4.4, is_available: true },
    { name: 'Defence AC Repair',       service_type: 'AC Technician', location: '24.7900, 67.0200', rating: 4.7, is_available: true },
    { name: 'Karachi Gas Connect',     service_type: 'Gas Fitter',    location: '24.8500, 67.0500', rating: 4.3, is_available: true },

    // LAHORE - DHA, Gulberg, Model Town, Johar Town, Bahria, Garden Town
    { name: 'DHA Lahore Electric',     service_type: 'Electrician',   location: '31.4800, 74.4000', rating: 4.6, is_available: true },
    { name: 'Gulberg AC Cooling',      service_type: 'AC Technician', location: '31.5100, 74.3500', rating: 4.7, is_available: true },
    { name: 'Model Town Pipe Master',  service_type: 'Plumbing',      location: '31.4900, 74.3200', rating: 4.5, is_available: true },
    { name: 'Johar Town AC Fix',       service_type: 'AC Technician', location: '31.4600, 74.2800', rating: 4.4, is_available: true },
    { name: 'Bahria Electric Pro',     service_type: 'Electrician',   location: '31.3700, 73.9800', rating: 4.8, is_available: true },
    { name: 'Garden Town Plumbing',    service_type: 'Plumbing',      location: '31.5200, 74.3200', rating: 4.6, is_available: true },
    { name: 'Allama Iqbal Cooling',    service_type: 'AC Technician', location: '31.5400, 74.4100', rating: 4.5, is_available: true },
    { name: 'Cantonment Electric',     service_type: 'Electrician',   location: '31.5550, 74.3900', rating: 4.7, is_available: true },
    { name: 'Faisal Town Gas Expert',  service_type: 'Gas Fitter',    location: '31.4700, 74.3150', rating: 4.4, is_available: true },
    { name: 'Lahore Gas Installation', service_type: 'Gas Fitter',    location: '31.4950, 74.3450', rating: 4.6, is_available: true },
    { name: 'Township Plumber',        service_type: 'Plumbing',      location: '31.5050, 74.3750', rating: 4.5, is_available: true },
  ].map(p => {
    let price = 2000;
    if (p.service_type === 'AC Technician') {
      price = Math.floor(Math.random() * (3000-1500+1) + 1500);
    } else if (p.service_type === 'Plumbing') {
      price = Math.floor(Math.random() * (2000-800+1) + 800);
    } else if (p.service_type === 'Electrician') {
      price = Math.floor(Math.random() * (2500-1000+1) + 1000);
    } else if (p.service_type === 'Gas Fitter') {
      price = Math.floor(Math.random() * (2200-1200+1) + 1200);
    }
    return { ...p, hourly_rate_pkr: price };
  });

  const { data, error } = await adminClient
    .from('service_providers')
    .insert(providers)
    .select();

  if (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Seeded ${data?.length ?? 0} providers successfully.`);
  console.log('Coverage:');
  console.log('  • Islamabad: 11 providers (AC, Electrician, Plumbing, Gas)');
  console.log('  • Karachi: 14 providers (AC, Electrician, Plumbing, Gas)');
  console.log('  • Lahore: 11 providers (AC, Electrician, Plumbing, Gas)');
  console.log('  • Total: 36 providers across 3 cities, 4 service types');
}

seedProviders().catch(console.error);