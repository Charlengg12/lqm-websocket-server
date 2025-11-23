const WebSocket = require('ws');

// CRITICAL: Render provides PORT via environment variable
// Must use this port, not hardcoded 8080
const PORT = process.env.PORT || 10000;

const wss = new WebSocket.Server({
    port: PORT,
    host: '0.0.0.0'  // IMPORTANT: Must bind to 0.0.0.0 for Render
});

console.log(`🚀 WebSocket server starting on port ${PORT}`);

// Track connected clients
let clients = new Set();

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`✅ Client connected from ${clientIp}`);
    console.log(`📊 Total clients: ${wss.clients.size}`);

    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'server',
        message: 'Connected to WebSocket server',
        timestamp: Date.now()
    }));

    ws.on('message', (message) => {
        try {
            const data = message.toString();
            console.log('📩 Received:', data);

            // Parse to check if it's ESP32 data
            const parsed = JSON.parse(data);
            if (parsed.type === 'esp32') {
                console.log('🔧 ESP32 Data:', parsed.sensordata);
            }

            // Broadcast to all connected clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            });

        } catch (error) {
            console.error('❌ Error processing message:', error);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log(`❌ Client disconnected from ${clientIp}`);
        console.log(`📊 Total clients: ${wss.clients.size}`);
    });

    ws.on('error', (error) => {
        console.error('⚠️ WebSocket error:', error);
    });

    // Keep-alive ping
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 30000);

    ws.on('close', () => {
        clearInterval(pingInterval);
    });
});

wss.on('listening', () => {
    console.log(`✅ WebSocket server is running on port ${PORT}`);
    console.log(`🌐 Ready to accept connections on 0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, closing server...');
    wss.close(() => {
        console.log('👋 Server closed');
        process.exit(0);
    });
});
