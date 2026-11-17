-- ====================================================================
-- PHASE 2: SEED 30 REALISTIC HACKATHON TEAMS FOR DEMO
-- ====================================================================

INSERT INTO public.teams (team_id, team_name, college, members, status, current_round, extra_data)
VALUES
('NEX-01', 'Quantum Coders', 'Geeta University', '["Aarav Sharma", "Pooja Patel", "Rohan Gupta"]'::jsonb, 'active', 1, '{"project":"AI Disaster Response","track":"AI & ML"}'::jsonb),
('NEX-02', 'Binary Beasts', 'IIT Delhi', '["Vikram Malhotra", "Sneha Rao"]'::jsonb, 'active', 1, '{"project":"Decentralized Identity","track":"Web3"}'::jsonb),
('NEX-03', 'Cyber Hawks', 'DTU', '["Kabir Singh", "Neha Verma", "Aditya Joshi"]'::jsonb, 'active', 1, '{"project":"Smart Grid Monitor","track":"IoT"}'::jsonb),
('NEX-04', 'AlgoRhythm', 'Geeta University', '["Ananya Roy", "Karan Mehra"]'::jsonb, 'active', 1, '{"project":"Automated Healthcare Triage","track":"Healthcare"}'::jsonb),
('NEX-05', 'Code Catalyst', 'NSUT', '["Meera Nair", "Devansh Sen"]'::jsonb, 'active', 1, '{"project":"FinTech Fraud Shield","track":"Fintech"}'::jsonb),
('NEX-06', 'NeuroBytes', 'Thapar University', '["Simran Kaur", "Harsh Vardhan"]'::jsonb, 'active', 1, '{"project":"Assistive Vision AI","track":"Accessibility"}'::jsonb),
('NEX-07', 'Glitch Hunters', 'Chitkara University', '["Arjun Kapoor", "Bhavna Joshi"]'::jsonb, 'active', 1, '{"project":"AgriDrone Crop Scout","track":"AgriTech"}'::jsonb),
('NEX-08', 'DevForge', 'Geeta University', '["Rishi Prasad", "Tanvi Bhatia"]'::jsonb, 'active', 1, '{"project":"Green Logistics Route Optimizer","track":"CleanTech"}'::jsonb),
('NEX-09', 'ByteBenders', 'PEC Chandigarh', '["Deepak Saini", "Ishita Grover"]'::jsonb, 'active', 1, '{"project":"Campus Safety Guardian","track":"EdTech"}'::jsonb),
('NEX-10', 'Apex Legends', 'Kurukshetra University', '["Naveen Hooda", "Poonam Rani"]'::jsonb, 'active', 1, '{"project":"Clean Energy Microgrid","track":"CleanTech"}'::jsonb),
('NEX-11', 'Neural Net Ninjas', 'BITS Pilani', '["Rohan Sengupta", "Diya Banerjee"]'::jsonb, 'active', 1, '{"project":"Sign Language Voice Synth","track":"Accessibility"}'::jsonb),
('NEX-12', 'Cloud Crafters', 'Geeta University', '["Manish Kumar", "Sakshi Malik"]'::jsonb, 'active', 1, '{"project":"Autonomous Serverless Scaling","track":"DevOps"}'::jsonb),
('NEX-13', 'ZeroKnowledge', 'IIIT Delhi', '["Tarun Gill", "Komal Sethi"]'::jsonb, 'active', 1, '{"project":"Private Medical Ledger","track":"Web3"}'::jsonb),
('NEX-14', 'EcoPulse', 'Chitkara University', '["Abhinav Bansal", "Rhea Jain"]'::jsonb, 'active', 1, '{"project":"Smart EV Fleet Routing","track":"CleanTech"}'::jsonb),
('NEX-15', 'HyperLoop Devs', 'Geeta University', '["Gaurav Soni", "Anushka Tyagi"]'::jsonb, 'active', 1, '{"project":"AI Traffic Signal Harmonizer","track":"Smart Cities"}'::jsonb),
('NEX-16', 'Data Dragons', 'IIT Roorkee', '["Siddharth Das", "Pragya Mishra"]'::jsonb, 'active', 1, '{"project":"Subsurface Water Aquifer Radar","track":"AgriTech"}'::jsonb),
('NEX-17', 'Pixel Pioneers', 'DTU', '["Kunal Khanna", "Ritu Rawat"]'::jsonb, 'active', 1, '{"project":"Real-Time Deepfake Sentinel","track":"Cybersecurity"}'::jsonb),
('NEX-18', 'BioSensors X', 'Geeta University', '["Sameer Khan", "Tanya Dutta"]'::jsonb, 'active', 1, '{"project":"Non-Invasive Glucose Patch","track":"Healthcare"}'::jsonb),
('NEX-19', 'BlockChamps', 'NSUT', '["Varun Chawla", "Palak Gandhi"]'::jsonb, 'active', 1, '{"project":"Carbon Credit Exchange","track":"Web3"}'::jsonb),
('NEX-20', 'RoboRaptors', 'Thapar University', '["Karanbir Dhillon", "Jasleen Sandhu"]'::jsonb, 'active', 1, '{"project":"Warehouse Micro-Swarm","track":"Robotics"}'::jsonb),
('NEX-21', 'Aegis Sentinel', 'PEC Chandigarh', '["Nitesh Mittal", "Shreya Sood"]'::jsonb, 'active', 1, '{"project":"Critical Infrastructure Honeypot","track":"Cybersecurity"}'::jsonb),
('NEX-22', 'Zenith AI', 'Geeta University', '["Akhil Bhardwaj", "Neha Chhabra"]'::jsonb, 'active', 1, '{"project":"Mental Health Companion Bot","track":"Healthcare"}'::jsonb),
('NEX-23', 'Solaris Minds', 'Kurukshetra University', '["Ajay Ahlawat", "Jyoti Sharma"]'::jsonb, 'active', 1, '{"project":"Solar Cell Thermal Dissipater","track":"CleanTech"}'::jsonb),
('NEX-24', 'FinNova', 'IIT Delhi', '["Udit Narayan", "Chhavi Agarwal"]'::jsonb, 'active', 1, '{"project":"Micro-Lending Underwriting AI","track":"Fintech"}'::jsonb),
('NEX-25', 'AquaRescue', 'Geeta University', '["Vikas Yadav", "Suman Lata"]'::jsonb, 'active', 1, '{"project":"Smart Flood Sensor Buoys","track":"IoT"}'::jsonb),
('NEX-26', 'MetaMinds', 'Chitkara University', '["Devanshu Garg", "Nikita Goyal"]'::jsonb, 'active', 1, '{"project":"Haptic Surgical Training VR","track":"Healthcare"}'::jsonb),
('NEX-27', 'Spectra Dynamics', 'DTU', '["Aniket Saxena", "Suhani Taneja"]'::jsonb, 'active', 1, '{"project":"Satellite Methane Plume Spotter","track":"CleanTech"}'::jsonb),
('NEX-28', 'SecureMesh', 'Geeta University', '["Pankaj Dhiman", "Deepika Kaushik"]'::jsonb, 'active', 1, '{"project":"Peer-to-Peer Disaster Mesh","track":"Cybersecurity"}'::jsonb),
('NEX-29', 'Veloce AI', 'BITS Pilani', '["Rishabh Bajaj", "Manya Singhania"]'::jsonb, 'active', 1, '{"project":"Autonomous Delivery Rover","track":"Robotics"}'::jsonb),
('NEX-30', 'Genesis Labs', 'Geeta University', '["Harshit Tanwar", "Simran Walia"]'::jsonb, 'active', 1, '{"project":"Zero-Waste Supply Chain Tracker","track":"CleanTech"}'::jsonb)
ON CONFLICT (team_id) DO UPDATE
SET team_name = EXCLUDED.team_name,
    college = EXCLUDED.college,
    members = EXCLUDED.members,
    extra_data = EXCLUDED.extra_data;
