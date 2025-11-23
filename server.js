const WebSocket = require('ws');

// Render provides PORT via environment variable
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({
    port: PORT,
    // Add health check path for Render
    verifyClient: (info) => {
        return true; // Accept all connections
    }
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

            // Broadcast to all connected clients except sender
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            });

            // Echo back to sender for confirmation
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'ack',
                    message: 'Data received and broadcast',
                    timestamp: Date.now()
                }));
            }

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

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 30000);

    ws.on('close', () => {
        clearInterval(pingInterval);
    });
});

// Health check endpoint for Render
wss.on('listening', () => {
    console.log(`✅ WebSocket server is running on port ${PORT}`);
    console.log(`🌐 Ready to accept connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, closing server...');
    wss.close(() => {
        console.log('👋 Server closed');
        process.exit(0);
    });
});
