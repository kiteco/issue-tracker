// Contents of this plugin will be reset by Kite on start. Changes you make are not guaranteed to persist.


// Internal Kite note: to enable gathering output (stdout+stderr) of debug runs, uncomment the code related
//   to XDebugProcess.
// Note this will prevent our plugin from running on PyCharm builds < PC-139.1659 (~April 2015).
// It's likely that many people use builds before PC-139.1659, so for those we must use some kind of late
//   binding to allow our plugin to still boot for them (without debug run output capture), or switch to
//   a different API.


import com.intellij.execution.process.*;
import com.intellij.openapi.application.ApplicationInfo;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ApplicationNamesInfo;
import com.intellij.openapi.application.Result;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.components.ProjectComponent;
import com.intellij.openapi.editor.*;
import com.intellij.openapi.editor.event.*;
import com.intellij.openapi.editor.markup.*;
import com.intellij.openapi.fileEditor.*;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.Pair;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.wm.IdeFrame;
import com.intellij.openapi.wm.ex.WindowManagerEx;
import com.intellij.util.messages.MessageBusConnection;
//import com.intellij.xdebugger.XDebugProcess;
//import com.intellij.xdebugger.XDebuggerManager;
//import com.intellij.xdebugger.XDebuggerManagerListener;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;
import java.awt.*;
import java.awt.event.WindowEvent;
import java.awt.event.WindowFocusListener;
import java.io.*;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.security.MessageDigest;
import java.util.*;
import java.util.List;

public class KiteProjectComponent implements ProjectComponent, DocumentListener, /* SelectionListener, */ FileEditorManagerListener, CaretListener{ // ,  XDebuggerManagerListener {

    private static final boolean DEBUG = false;

    private final Project m_project;
    private final KiteLocalhostConnection m_kiteConnection;

    private MessageBusConnection m_messageBus;

    // for managing our listeners attached to the window focused events
    private WindowFocusListener m_windowFocusListener;
    private Window m_projectWindowFocusListened = null;

    // for managing "simultaneous" edit/selection events
    private int m_numEditEventsWaitingForCallback = 0;
    private final Object m_numEventsWaitingForCallbackLock = new Object();

    // for handling diff suggestions
    private final List<Pair<Editor, List<RangeHighlighter>>> m_currentHighlights =
            new ArrayList<Pair<Editor, List<RangeHighlighter>>>();


    public KiteProjectComponent(Project project) throws Exception {
        m_project = project;
        String fullName = ApplicationNamesInfo.getInstance().getFullProductName();
        String source = fullName.contains("IDEA") ? "intellij" : "pycharm";
        m_kiteConnection = new KiteLocalhostConnection(this, source);

        m_windowFocusListener = new WindowFocusListener() {
            @Override
            public void windowGainedFocus(WindowEvent windowEvent) {
                sendEvent("focus", FileEditorManager.getInstance(m_project).getSelectedTextEditor());
            }

            @Override
            public void windowLostFocus(WindowEvent windowEvent) {
                sendEvent("lost_focus", FileEditorManager.getInstance(m_project).getSelectedTextEditor());
            }
        };
    }


    // -----Logging-----
    public static void log(String message) {
        if(DEBUG) {
            System.out.println(message);
        }
    }

    public static void logException(String message, Exception e) {
        StringWriter sw = new StringWriter();
        sw.write(message + "\n");
        sw.write(e.getMessage() + "\n");
        e.printStackTrace(new PrintWriter(sw));
        log(sw.toString());
    }


    // -----ProjectComponent-----
    @Override
    public void initComponent() {
        m_messageBus = m_project.getMessageBus().connect();
        m_messageBus.subscribe(FileEditorManagerListener.FILE_EDITOR_MANAGER, this);
        //m_messageBus.subscribe(XDebuggerManager.TOPIC, this);

        ApplicationManager.getApplication().invokeLater(new Runnable() {
            @Override
            public void run() {
                sendEvent("focus", FileEditorManager.getInstance(m_project).getSelectedTextEditor());
            }
        });
        EditorFactory.getInstance().getEventMulticaster().addDocumentListener(this, m_project);
        EditorFactory.getInstance().getEventMulticaster().addCaretListener(this, m_project);


        try {
            String url = "https://plugins.kite.com/intellij_version/" +
                    URLEncoder.encode(ApplicationInfo.getInstance().getFullVersion(), "UTF-8") + "/" +
                    URLEncoder.encode(ApplicationInfo.getInstance().getBuild().asStringWithAllDetails(), "UTF-8");

            URL obj = new URL(url);
            HttpURLConnection con = (HttpURLConnection) obj.openConnection();
            con.getResponseCode();
            con.disconnect();
        } catch(Exception e) {
            // do nothing
            // (this is a temporary experiment)
        }
    }

    @Override
    public void disposeComponent() {
        // commenting this code out because we've seen an instance of the above invokeLater()
        //   in `initComponent` coming after a call to `disposeComponent()`.
        // in principle this doesn't mean anything funky is happening with the object lifecycle, but
        //   for the sake of simplicity let's not worry about executing the steps below.
        // from searching on Github, it seems like most ProjectComponents don't do things like
        //   disconnect from the message bus on dispose.
//        m_project = null;
//        try {
//            if (m_messageBus != null) {
//                m_messageBus.disconnect();
//            }
//        } finally {
//            m_messageBus = null;
//
//            try {
//                m_kiteConnection.close();
//            } finally {
//                m_kiteConnection = null;
//            }
//        }
    }

    @Override
    @NotNull
    public String getComponentName() {
        return "KiteProjectComponent";
    }

    @Override
    public void projectOpened() {
        // thread safety assumption for projectOpened + projectClosed: I'm assuming that each
        //   will only only be called one at a time.

        IdeFrame projectFrame = WindowManagerEx.getInstanceEx().findFrameFor(m_project);
        removeWindowFocusListener();
        m_projectWindowFocusListened = SwingUtilities.windowForComponent(projectFrame.getComponent());
        m_projectWindowFocusListened.addWindowFocusListener(m_windowFocusListener);
    }

    @Override
    public void projectClosed() {
        removeWindowFocusListener();

        // send "lostfocused" event?
    }

    private void removeWindowFocusListener() {
        if(m_projectWindowFocusListened != null) {
            m_projectWindowFocusListened.removeWindowFocusListener(m_windowFocusListener);
            m_projectWindowFocusListened = null;
        }
    }


    // -----FileEditorManagerListener-----
    public void fileOpened(@NotNull FileEditorManager source, @NotNull VirtualFile file) {
    }

    public void fileClosed(@NotNull FileEditorManager source, @NotNull VirtualFile file) {
    }

    // this has nothing to do with changes in the char selection ranges in an editor.
    // this is called when the currently-active-editor changes.
    public void selectionChanged(@NotNull FileEditorManagerEvent event) {
        log("selection changed " + event.toString());
        sendEvent("focus", event.getManager().getSelectedTextEditor());
    }


    // -----DocumentListener-----
    public void beforeDocumentChange(DocumentEvent event) {
    }

    public void documentChanged(DocumentEvent event) {
        final Editor selectedTextEditor = FileEditorManager.getInstance(m_project).getSelectedTextEditor();
        if (selectedTextEditor == null || !selectedTextEditor.getDocument().equals(event.getDocument())) {
            // the currently active document doesn't match the document for this event.  this could happen e.g. in a
            //   multi-file find/replace.  for this case, skip the event.

            // the other corner case would be: same document open in two editors.  in this case we do want to pass the
            //   event through.
            return;
        }
        log("------EDIT");
        synchronized (m_numEventsWaitingForCallbackLock) {
            m_numEditEventsWaitingForCallback++;
        }
        ApplicationManager.getApplication().invokeLater(new Runnable() {
            @Override
            public void run() {
                sendEvent("edit", selectedTextEditor);
                sendEvent("selection", selectedTextEditor);
                synchronized (m_numEventsWaitingForCallbackLock) {
                    m_numEditEventsWaitingForCallback--;
                }
            }
        });
    }


    // -----SelectionListener/CaretListener-----
    @Override
    public void caretPositionChanged(final CaretEvent event) {
        log("------SELCHANGED");
        synchronized (m_numEventsWaitingForCallbackLock) {
            if(m_numEditEventsWaitingForCallback > 0) {
                // we're in the middle of an edit event => suppress the selection event
                log("suppressing selection event");
                return;
            }
        }

        ApplicationManager.getApplication().invokeLater(new Runnable() {
            @Override
            public void run() {
                synchronized (m_numEventsWaitingForCallbackLock) {
                    if (m_numEditEventsWaitingForCallback > 0) {
                        // there was an edit event immediately after the selection event.
                        // was a backspace (selection followed by an edit) => wait for
                        //   processing of the 'edit' event; it will send the 'selection' event.
                        return;
                    }
                }

                // this was just a selection event, there was no edit immediately before, or after
                sendEvent("selection", event.getEditor());
            }
        });
    }

    @Override
    public void caretAdded(CaretEvent caretEvent) {
    }

    @Override
    public void caretRemoved(CaretEvent caretEvent) {
    }


    // -----sendEvent-----
    private void sendEvent(String action, Editor editor) {
        try {
            if (editor == null) {
                return;
            }
            VirtualFile file = FileDocumentManager.getInstance().getFile(editor.getDocument());
            if (file == null) {
                log("  -> null file, skipping event");
                return;
            }
            if (!file.isInLocalFileSystem()) {
                log("  -> non-local file, skipping event");
                return;
            }

            m_kiteConnection.sendEvent(action, file.getCanonicalPath(),
                    editor.getDocument().getText(), editor.getSelectionModel().getSelectionStart(),
                    editor.getSelectionModel().getSelectionEnd());
        } catch (Exception e) {
            logException("Exception sending event", e);
        }
    }


    // -----inbound suggestions-----
    // note these handle* functions will be called on a thread that we create.
    public void handleHighlight(@NotNull final Suggestion suggestion) throws IOException {
        final List<Editor> relevantEditors = getRelevantEditors(suggestion.filename);
        if (relevantEditors.size() == 0) {
            log("Couldn't find relevant editor");
            return;
        }

        ApplicationManager.getApplication().invokeLater(new Runnable() {
            @Override
            public void run() {
                final TextAttributes attributes = new TextAttributes();
                attributes.setEffectType(EffectType.SEARCH_MATCH);
                attributes.setBackgroundColor(new Color(248, 0, 76));
                attributes.setForegroundColor(Color.WHITE);

                boolean anyEditorsWorked = false;
                List<Pair<Editor, List<RangeHighlighter>>> newHighlights = new ArrayList<Pair<Editor, List<RangeHighlighter>>>();

                try {
                    for (Editor relevantEditor : relevantEditors) {

                        // double check md5
                        if (!verifySuggestionMd5Match(relevantEditor, suggestion)) {
                            continue;
                        }

                        List<RangeHighlighter> highlighters = new ArrayList<RangeHighlighter>();
                        for (Diff diff : suggestion.diffs) {
                            highlighters.add(relevantEditor.getMarkupModel().addRangeHighlighter(
                                    diff.begin, diff.end, HighlighterLayer.ERROR + 100,
                                    attributes, HighlighterTargetArea.EXACT_RANGE));
                        }

                        newHighlights.add(Pair.create(relevantEditor, highlighters));
                        anyEditorsWorked = true;
                    }
                    if(!anyEditorsWorked) {
                        reportSuggestionError("buffer mismatch", relevantEditors.get(0), suggestion);
                    }
                } catch(Exception e) {
                    logException("Exception while applying highlight", e);
                    reportSuggestionError("exception: " + e.getMessage(), relevantEditors.get(0), suggestion);
                }

                synchronized (m_currentHighlights) {
                    m_currentHighlights.addAll(newHighlights);
                }
            }
        });
    }

    public void handleClear(@NotNull final Suggestion suggestion) {
        handleClear();
    }

    public void handleClear() {
        ApplicationManager.getApplication().invokeLater(new Runnable() {
            @Override
            public void run() {
                List<Pair<Editor, List<RangeHighlighter>>> allHighlights = new ArrayList<Pair<Editor, List<RangeHighlighter>>>();

                synchronized (m_currentHighlights) {
                    allHighlights.addAll(m_currentHighlights);
                    m_currentHighlights.clear();
                }

                for(Pair<Editor, List<RangeHighlighter>> highlights : allHighlights) {
                    MarkupModel markupModel = highlights.getFirst().getMarkupModel();

                    for (RangeHighlighter highlight : highlights.getSecond()) {
                        markupModel.removeHighlighter(highlight);
                    }
                }
            }
        });
    }

    public void handleApply(@NotNull final Suggestion suggestion) throws IOException {
        final List<Editor> relevantEditors = getRelevantEditors(suggestion.filename);
        if (relevantEditors.size() == 0) {
            log("Couldn't find relevant editor.  NOT applying diff.");
            return;
        }
        final Document document = relevantEditors.get(0).getDocument();

        ApplicationManager.getApplication().invokeLater(new Runnable() {
            @Override
            public void run() {
                // double check md5 (since we've waited for the invokeLater callback)
                if (!verifySuggestionMd5Match(document, suggestion)) {
                    log("Relevant editor now has new contents.  NOT applying diff.");
                    reportSuggestionError("buffer mismatch", relevantEditors.get(0), suggestion);
                    return;
                }

                if(!document.isWritable()) {
                    log("Document is not editable.  NOT applying diff.");
                    reportSuggestionError("not editable", relevantEditors.get(0), suggestion);
                }

                final Runnable runnable = new Runnable() {
                    @Override
                    public void run() {
                        try {
                            int adj = 0;
                            for (Diff diff : suggestion.diffs) {
                                diff.begin += adj;
                                diff.end += adj;

                                document.replaceString(diff.begin, diff.end, diff.destination);
                                adj += diff.destination.length() - diff.source.length();
                            }
                        } catch(Exception e) {
                            logException("Exception applying suggestion", e);
                            reportSuggestionError("exception: " + e.getMessage(), relevantEditors.get(0), suggestion);
                        }
                    }
                };

                // don't use WriteCommandAction.runWriteCommandAction because it isn't supported
                //   by earlier versions of IntelliJ.
                new WriteCommandAction<Void>(null) {
                    @Override
                    protected void run(@NotNull Result<Void> result) throws Throwable {
                        runnable.run();
                    }
                }.execute();

                handleClear();
            }
        });
    }

    private List<Editor> getRelevantEditors(String filePath) throws IOException {
        List<Editor> y = new ArrayList<Editor>();
        for (Editor editor : EditorFactory.getInstance().getAllEditors()) {
            if (editor == null) {
                continue;
            }
            VirtualFile file = FileDocumentManager.getInstance().getFile(editor.getDocument());
            if (file == null) {
                continue;
            }
            if (!file.isInLocalFileSystem()) {
                continue;
            }

            String canonical = file.getCanonicalPath();
            if(canonical == null) {
                continue;
            }
            if (canonical.equals(filePath)) {
                // strict string equals, we're good
                y.add(editor);
                continue;
            }
            // now we have to check with the file system to see if the file paths represent the same file
            if (canonical.equals(new File(filePath).getCanonicalPath())) {
                y.add(editor);
            }
        }
        return y;
    }

    private static String toLowercaseHex(byte[] bytes) {
        BigInteger bi = new BigInteger(1, bytes);
        return String.format("%0" + (bytes.length << 1) + "X", bi).toLowerCase();
    }

    private boolean verifySuggestionMd5Match(@NotNull final Editor editor, @NotNull final Suggestion suggestion) {
        return verifySuggestionMd5Match(editor.getDocument(), suggestion);
    }

    private boolean verifySuggestionMd5Match(@NotNull final Document document, @NotNull final Suggestion suggestion) {
        try {
            byte[] editorTextBytes = document.getText().getBytes("UTF-8");
            String editorTextMd5 = toLowercaseHex(MessageDigest.getInstance("MD5").digest(editorTextBytes));
            return editorTextMd5.equals(suggestion.file_md5);
        } catch(Exception e) {
            logException("Exception checking md5", e);
            return false;
        }
    }

    private void reportSuggestionError(String message, Editor editor, Suggestion suggestion) {
        String editorText = editor.getDocument().getText();
        String editorTextMd5;
        try {
            editorTextMd5 = toLowercaseHex(MessageDigest.getInstance("MD5").digest(editorText.getBytes("UTF-8")));
        } catch(Exception e) {
            editorTextMd5 = "";
        }
        try {
            m_kiteConnection.sendSuggestionError(message, suggestion.filename, editorText, editorTextMd5,
                    suggestion.file_base64, suggestion.file_md5, suggestion);
        } catch(Exception e2) {
            logException("Exception trying to report suggestion error", e2);
        }
    }


    // -----Terminal / Console-----
    // note: we could really get a lot more here, e.g. exit code, which output was stdin/stdout/stderr,
    //   execution time, ...

//    private static final Key<KiteProcessListener> PROCESS_LISTENER_KEY = new Key<KiteProcessListener>("com.kite.KiteProcessListener");
//
//    @Override
//    public void processStarted(@NotNull XDebugProcess xDebugProcess) {
//        ProcessHandler processHandler = xDebugProcess.getProcessHandler();
//
//        String commandLine = null;
//        if(processHandler instanceof BaseOSProcessHandler) {
//            commandLine = ((BaseOSProcessHandler)processHandler).getCommandLine();
//        }
//
//        final KiteProcessListener previousListener = processHandler.getUserData(PROCESS_LISTENER_KEY);
//        if (previousListener != null) {
//            processHandler.removeProcessListener(previousListener);
//        }
//        final KiteProcessListener listener = new KiteProcessListener(commandLine);
//        processHandler.addProcessListener(listener);
//        processHandler.putUserData(PROCESS_LISTENER_KEY, listener);
//    }
//
//    @Override
//    public void processStopped(@NotNull XDebugProcess xDebugProcess) {
//    }
//
//    private class KiteProcessListener implements ProcessListener {
//
//        private String m_commandLine;
//        private StringBuilder m_text = new StringBuilder();
//
//        public KiteProcessListener(String commandLine) {
//            m_commandLine = commandLine;
//        }
//
//        @Override
//        public void onTextAvailable(ProcessEvent event, Key outputType) {
//            if(outputType == ProcessOutputTypes.STDERR || outputType == ProcessOutputTypes.STDOUT) {
//                m_text.append(event.getText());
//            }
//            // don't do anything for outputType `ProcessOutputTypes.SYSTEM`.
//            //   (it's intellij's markup like "Process finished with exit code 0" etc.)
//        }
//
//        @Override
//        public void processTerminated(ProcessEvent processEvent) {
//            processEvent.getProcessHandler().removeProcessListener(this);
//        }
//
//        @Override
//        public void startNotified(ProcessEvent processEvent) {
//        }
//
//        @Override
//        public void processWillTerminate(ProcessEvent processEvent, boolean b) {
//        }
//
//    }
}
