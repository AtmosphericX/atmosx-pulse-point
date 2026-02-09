const {PulsePoint} = require(`atmosx-pulse-point`);

const pulse = new PulsePoint({
    key: 'password_1234567890',
    interval: 30,
    filtering: {
        events: [
            "Mutual Aid", "Structure Fire", "Aircraft Crash", "Aircraft Emergency",
            "Aircraft Emergency Standby", "Fire Alarm", "Flooding", "Public Service",
            "Shed/Outbuilding Fire", "Explosion", "Commercial Fire", "Electrical Fire",
            "Elevator Fire", "Fire", "Industrial Fire", "Marine Fire", "Outside Fire", 
            "Pool Fire", "Grass Fire", "Residential Fire", "Disaster", "Unknown"
        ],
        agencies: [
            "EMS1396"
        ]
    }
});

pulse.on(`onIncidentUpdate`, (event) => {
    console.log(`[${event.properties.agency}] ${event.properties.event} at ${event.properties.address} (Units: x${(event.properties.units || []).length})`);
});