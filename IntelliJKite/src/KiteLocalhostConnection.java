// Contents of this plugin will be reset by Kite on start. Changes you make are not guaranteed to persist.


import com.google.gson.Gson;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;

public class KiteLocalhostConnection {

    private static final String UDP_HOST = "127.0.0.1";
    private static final int UDP_PORT = 46625;
    private static final int INBOUND_RECEIVE_BUFFER_SIZE = 10*1024*2014;  // 10 MB

    private final String m_source;  // "idea" or "intellij"

    private KiteProjectComponent m_projectComponent;
    private DatagramSocket m_outbound;
    private DatagramSocket m_inbound;
    private final int m_inboundPort;
    private final String m_pluginID;

    public KiteLocalhostConnection(KiteProjectComponent projectComponent, String source) throws Exception {
        m_source = source;
        m_projectComponent = projectComponent;
        m_outbound = new DatagramSocket();

        m_inbound = new DatagramSocket(0, InetAddress.getByName("127.0.0.1"));
        m_inboundPort = m_inbound.getLocalPort();
        m_pluginID = "udp://127.0.0.1:" + m_inboundPort;
        m_projectComponent.log("local inbound port: " + m_inboundPort);
        startInboundLoop();
    }


    // -----outbound-----
    public void sendEvent(String action, String filename, String text, int selStart, int selEnd) throws Exception {
        OutboundEvent event = new OutboundEvent();
        event.source = m_source;
        event.action = action;
        event.filename = filename;
        event.text = text;
        event.pluginId = m_pluginID;

        OutboundEventSelectionRange selRange = new OutboundEventSelectionRange();
        selRange.start = selStart;
        selRange.end = selEnd;
        event.selections = new ArrayList<OutboundEventSelectionRange>();
        event.selections.add(selRange);

        if(text.length() > 1024 * 1024) {
            event.action = "skip";
            event.text = "file_too_large";
        }

        sendJson(new Gson().toJson(event));
    }

    public void sendSuggestionError(String message, String filename, String userBuffer, String userMD5, String expectedBuffer,
                                    String expectedMD5, Suggestion suggestion) throws Exception {

        OutboundSuggestionErrorDetails text = new OutboundSuggestionErrorDetails();
        text.message = message;
        text.user_buffer = userBuffer;
        text.user_md5 = userMD5;
        text.expected_md5 = expectedMD5;
        text.expected_buffer = expectedBuffer;
        text.suggestion = suggestion;
        sendError(filename, new Gson().toJson(text));
    }

    public void sendError(String filename, String text) throws Exception {
        OutboundErrorEvent event = new OutboundErrorEvent();
        event.source = m_source;
        event.action = "error";
        event.filename = filename;
        event.text = text;
        event.pluginId = m_pluginID;
        sendJson(new Gson().toJson(event));
    }

    // thread safe because DatagramSocket.send is thread safe.
    private void sendJson(String jsonString) throws Exception {
        m_projectComponent.log(jsonString);

        byte[] packetBytes = jsonString.getBytes("UTF-8");
        DatagramPacket packet = new DatagramPacket(packetBytes, packetBytes.length,
                InetAddress.getByName(UDP_HOST), UDP_PORT);
        m_outbound.send(packet);
    }

    public void close() {
        m_outbound.close();
    }


    // -----inbound-----
    private void startInboundLoop() {
        Thread t = new Thread() {
            public void run() {
                try {
                    byte[] buffer = new byte[INBOUND_RECEIVE_BUFFER_SIZE];

                    while (true) {
                        try {
                            DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                            m_inbound.receive(packet);

                            Reader bufferReader = new InputStreamReader(new ByteArrayInputStream(packet.getData(),
                                    packet.getOffset(), packet.getLength()));
                            Suggestion suggestion;
                            try {
                                suggestion = new Gson().fromJson(bufferReader, Suggestion.class);
                            } finally {
                                bufferReader.close();
                            }
                            m_projectComponent.log(new String(buffer, packet.getOffset(), packet.getLength()));

                            handleSuggestion(suggestion);
                        } catch (Exception e) {
                            m_projectComponent.logException("Exception processing inbound message", e);
                        }
                    }
                } finally {
                    m_inbound.close();
                }
            }
        };
        t.start();
    }

    private void handleSuggestion(Suggestion suggestion) throws IOException {
        String type = suggestion.type;
        if (type.equals("apply")) {
            m_projectComponent.handleApply(suggestion);
        } else if (type.equals("highlight")) {
            m_projectComponent.handleHighlight(suggestion);
        } else if (type.equals("clear")) {
            m_projectComponent.handleClear(suggestion);
        }
    }
}

class OutboundEvent {
    String source;
    String action;
    String filename;
    String text;
    String pluginId;
    List<OutboundEventSelectionRange> selections;
}

class OutboundEventSelectionRange {
    int start;
    int end;
}

class OutboundErrorEvent {
    String source;
    String action;
    String filename;
    String text;
    String pluginId;
}

class OutboundSuggestionErrorDetails {
    String message;
    String user_buffer;
    String user_md5;
    String expected_md5;
    String expected_buffer;
    Suggestion suggestion;
}

class Suggestion {
    String type;
    double score;
    String plugin_id;
    String file_md5;
    String file_base64;
    String filename;
    List<Diff> diffs;
}

class Diff {
    String type;
    int linenum;
    int begin;
    int end;
    String source;
    String destination;
    String line_src;
    String line_dst;
}