
import React, { useState, useRef } from 'react';
    import { Source } from '../types';
    import { fetchWebsiteContent, processFileWithGemini, runNebulaScout } from '../services/ai';
    import { FileText, Link as LinkIcon, Youtube, Type, Upload, Trash2, Globe, FileAudio, Image, PlusCircle, X, Loader2, Plus, Radar, Search } from 'lucide-react';
    import { useNavigate } from 'react-router-dom';
    import { useTheme } from '../contexts';
    
    interface Props {
      sources: Source[];
      onAddSource: (s: Source) => void;
      onDeleteSource: (id: string) => void;
    }

    const SourceCard: React.FC<{ source: Source, onDeleteSource: (id: string) => void }> = ({ source, onDeleteSource }) => {
        const { theme } = useTheme();
        let Icon = FileText;
        let colorClass = "text-slate-400";
        let bgClass = "bg-slate-900";
        
        if (source.type === 'website') { Icon = Globe; colorClass = "text-blue-400"; bgClass = "group-hover:bg-blue-500/10"; }
        if (source.type === 'youtube') { Icon = Youtube; colorClass = "text-red-400"; bgClass = "group-hover:bg-red-500/10"; }
        if (source.type === 'copiedText') { Icon = Type; colorClass = "text-pink-400"; bgClass = "group-hover:bg-pink-500/10"; }
        if (source.type === 'audio') { Icon = FileAudio; colorClass = "text-purple-400"; bgClass = "group-hover:bg-purple-500/10"; }
        if (source.type === 'image') { Icon = Image; colorClass = "text-green-400"; bgClass = "group-hover:bg-green-500/10"; }
    
        return (
          <div className={`relative overflow-hidden glass-panel p-5 rounded-2xl border border-white/5 hover:border-${theme.colors.primary}-500/30 transition-all duration-300 group`}>
             <div className={`absolute inset-0 bg-gradient-to-r from-${theme.colors.primary}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}></div>

             <div className="relative z-10 flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border border-white/10 group-hover:border-${theme.colors.primary}-500/50 group-hover:shadow-[0_0_15px_rgba(var(--color-${theme.colors.primary}),0.15)] transition-all ${bgClass} shrink-0`}>
                    <Icon size={24} className={colorClass} />
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                         <div className="min-w-0">
                             <h3 className={`font-semibold text-slate-200 truncate pr-2 text-base group-hover:text-${theme.colors.primary}-300 transition-colors`}>
                                 {source.title}
                             </h3>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-slate-800 rounded px-1.5 py-0.5">
                                    {source.type}
                                </span>
                                <span className="text-xs text-slate-500 truncate max-w-[120px]">
                                    {source.type === 'copiedText' ? 'Pasted Content' : source.metadata?.originalUrl || source.metadata?.filename || 'File Upload'}
                                </span>
                             </div>
                         </div>
                         <button 
                            onClick={() => onDeleteSource(source.id)}
                            className="text-slate-600 hover:text-rose-500 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Source"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono">{source.content.length.toLocaleString()} chars</span>
                        <span>{new Date(source.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
             </div>
          </div>
        );
      };
    
    const SourcesTab: React.FC<Props> = ({ sources, onAddSource, onDeleteSource }) => {
      // Modal State
      const [activeModal, setActiveModal] = useState<'text' | 'website' | 'youtube' | 'file' | 'scout' | null>(null);
      const [fileType, setFileType] = useState<'pdf' | 'audio' | 'image' | null>(null);
      
      // Input State
      const [inputValue, setInputValue] = useState('');
      const [titleValue, setTitleValue] = useState('');
      const [selectedFile, setSelectedFile] = useState<File | null>(null);
      const [isProcessing, setIsProcessing] = useState(false);
      const [statusMessage, setStatusMessage] = useState('');
      const [error, setError] = useState<string | null>(null);

      const fileInputRef = useRef<HTMLInputElement>(null);
      const navigate = useNavigate();
      const { theme } = useTheme();
    
      const resetModal = () => {
          setActiveModal(null);
          setFileType(null);
          setInputValue('');
          setTitleValue('');
          setSelectedFile(null);
          setError(null);
          setIsProcessing(false);
          setStatusMessage('');
      };

      const handleAddSource = async () => {
        setError(null);
        setIsProcessing(true);
        
        try {
            let content = "";
            let finalTitle = titleValue;
            let type: Source['type'] = 'copiedText';
            let metadata: any = {};

            if (activeModal === 'scout') {
                const newSources = await runNebulaScout(inputValue, setStatusMessage);
                newSources.forEach(s => onAddSource(s));
                resetModal();
                return;
            }
            else if (activeModal === 'text') {
                content = inputValue;
                type = 'copiedText';
                if (!finalTitle) finalTitle = "Pasted Text " + new Date().toLocaleTimeString();
            } 
            else if (activeModal === 'website') {
                if (!inputValue.startsWith('http')) throw new Error("Invalid URL");
                content = await fetchWebsiteContent(inputValue);
                type = 'website';
                if (!finalTitle) finalTitle = inputValue; // Ideally fetch title from scraping result
                metadata = { originalUrl: inputValue };
            }
            else if (activeModal === 'youtube') {
                if (!inputValue.includes('youtube.com') && !inputValue.includes('youtu.be')) throw new Error("Invalid YouTube URL");
                
                try {
                    const oembedUrl = `https://noembed.com/embed?url=${inputValue}`;
                    const res = await fetch(oembedUrl);
                    const json = await res.json();
                    if (json.title) finalTitle = json.title;
                } catch (e) { console.warn("Could not fetch oEmbed", e); }

                if (!finalTitle) finalTitle = "YouTube Video";
                
                content = `[YouTube Video Source]\nURL: ${inputValue}\nTitle: ${finalTitle}\n\n(Note: Video transcript ingestion requires backend API. Treat this source as context for the video's existence.)`;
                type = 'youtube';
                metadata = { originalUrl: inputValue };
            }
            else if (activeModal === 'file' && selectedFile && fileType) {
                 if (!finalTitle) finalTitle = selectedFile.name;
                 
                 content = await processFileWithGemini(selectedFile, selectedFile.type);
                 type = fileType;
                 metadata = { filename: selectedFile.name, size: selectedFile.size };
            }

            if (!content) throw new Error("No content could be extracted.");

            const newSource: Source = {
                id: crypto.randomUUID(),
                type,
                title: finalTitle,
                content: content,
                createdAt: Date.now(),
                metadata
            };

            onAddSource(newSource);
            resetModal();

        } catch (err: any) {
            setError(err.message || "Failed to add source.");
        } finally {
            setIsProcessing(false);
        }
      };

      const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files && e.target.files[0]) {
              setSelectedFile(e.target.files[0]);
              if (!titleValue) setTitleValue(e.target.files[0].name);
          }
      };
    
      return (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/5 pb-6">
              <div className="space-y-2">
                 <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Sources</h2>
                 <p className="text-slate-400 max-w-lg leading-relaxed text-sm md:text-base">
                    Add content to ground your notebook. The AI uses these sources to answer questions and generate audio overviews.
                 </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                      <span className={`text-3xl md:text-4xl font-bold text-${theme.colors.primary}-400 drop-shadow-[0_0_10px_rgba(var(--color-${theme.colors.primary}),0.3)]`}>{sources.length}</span>
                      <span className="text-slate-500 text-sm block uppercase tracking-wider font-semibold mt-1">Total Sources</span>
                  </div>
                  <button 
                      onClick={() => navigate('/')} 
                      className={`mt-2 text-xs text-${theme.colors.primary}-400 hover:text-${theme.colors.primary}-300 flex items-center gap-1 border border-${theme.colors.primary}-500/20 rounded-full px-3 py-1 bg-${theme.colors.primary}-500/5 hover:bg-${theme.colors.primary}-500/10 transition-colors`}
                  >
                      <Plus size={12} /> New Notebook
                  </button>
              </div>
          </div>
    
          {/* Quick Actions */}
          <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pl-1">Add New Source</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                 <button 
                    onClick={() => setActiveModal('text')} 
                    className={`p-4 md:p-5 glass-panel rounded-2xl flex flex-col items-center gap-3 hover:bg-slate-800 hover:scale-[1.02] transition-all group border-transparent hover:border-${theme.colors.primary}-500/30`}
                 >
                     <div className="p-3 bg-rose-500/10 rounded-full group-hover:bg-rose-500/20 transition-colors">
                        <Type className="text-rose-400" size={24} />
                     </div>
                     <span className="text-xs md:text-sm font-medium text-slate-200">Paste Text</span>
                 </button>
                 
                 <button 
                    onClick={() => setActiveModal('website')}
                    className={`p-4 md:p-5 glass-panel rounded-2xl flex flex-col items-center gap-3 hover:bg-slate-800 hover:scale-[1.02] transition-all group border-transparent hover:border-${theme.colors.primary}-500/30`}
                 >
                     <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                        <Globe className="text-blue-400" size={24} />
                     </div>
                     <span className="text-xs md:text-sm font-medium text-slate-200">Website</span>
                 </button>
                 
                 <button 
                    onClick={() => setActiveModal('scout')}
                    className={`p-4 md:p-5 glass-panel rounded-2xl flex flex-col items-center gap-3 hover:bg-slate-800 hover:scale-[1.02] transition-all group border-transparent hover:border-${theme.colors.primary}-500/30 relative overflow-hidden`}
                 >
                     <div className={`absolute top-0 right-0 px-2 py-0.5 bg-${theme.colors.secondary}-500/80 text-white text-[9px] font-bold rounded-bl-lg`}>NEW</div>
                     <div className={`p-3 bg-${theme.colors.accent}-500/10 rounded-full group-hover:bg-${theme.colors.accent}-500/20 transition-colors`}>
                        <Radar className={`text-${theme.colors.accent}-400`} size={24} />
                     </div>
                     <span className="text-xs md:text-sm font-medium text-slate-200 text-center leading-tight">Nebula Scout</span>
                 </button>
                 
                 <button 
                    onClick={() => { setActiveModal('file'); setFileType('pdf'); }}
                    className={`p-4 md:p-5 glass-panel rounded-2xl flex flex-col items-center gap-3 hover:bg-slate-800 hover:scale-[1.02] transition-all group border-transparent hover:border-${theme.colors.primary}-500/30`}
                 >
                     <div className="p-3 bg-orange-500/10 rounded-full group-hover:bg-orange-500/20 transition-colors">
                        <FileText className="text-orange-400" size={24} />
                     </div>
                     <span className="text-xs md:text-sm font-medium text-slate-200">PDF</span>
                 </button>
                 
                 <button 
                    onClick={() => { setActiveModal('file'); setFileType('audio'); }}
                    className={`p-4 md:p-5 glass-panel rounded-2xl flex flex-col items-center gap-3 hover:bg-slate-800 hover:scale-[1.02] transition-all group border-transparent hover:border-${theme.colors.primary}-500/30`}
                 >
                     <div className="p-3 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-colors">
                        <FileAudio className="text-purple-400" size={24} />
                     </div>
                     <span className="text-xs md:text-sm font-medium text-slate-200">Audio</span>
                 </button>
                 
                 <button 
                    onClick={() => { setActiveModal('file'); setFileType('image'); }}
                    className={`p-4 md:p-5 glass-panel rounded-2xl flex flex-col items-center gap-3 hover:bg-slate-800 hover:scale-[1.02] transition-all group border-transparent hover:border-${theme.colors.primary}-500/30`}
                 >
                     <div className="p-3 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors">
                        <Image className="text-green-400" size={24} />
                     </div>
                     <span className="text-xs md:text-sm font-medium text-slate-200">Image</span>
                 </button>
              </div>
          </div>
    
          {/* Sources List */}
          <div className="pt-4">
            {sources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 glass-panel rounded-2xl border-dashed border-slate-700 bg-slate-900/30">
                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10">
                        <PlusCircle size={32} className="text-slate-600" />
                    </div>
                    <p className="text-xl font-medium text-slate-300">No sources yet</p>
                    <p className="text-sm mt-2 text-slate-500">Paste text, URL, or upload a file to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sources.map(s => <SourceCard key={s.id} source={s} onDeleteSource={onDeleteSource} />)}
                </div>
            )}
          </div>
    
          {/* Modals */}
          {activeModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-white/10 shadow-2xl relative">
                    <button onClick={resetModal} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>

                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        {activeModal === 'text' && <Type className="text-rose-400" />}
                        {activeModal === 'website' && <Globe className="text-blue-400" />}
                        {activeModal === 'youtube' && <Youtube className="text-red-500" />}
                        {activeModal === 'file' && fileType === 'pdf' && <FileText className="text-orange-400" />}
                        {activeModal === 'file' && fileType === 'audio' && <FileAudio className="text-purple-400" />}
                        {activeModal === 'file' && fileType === 'image' && <Image className="text-green-400" />}
                        {activeModal === 'scout' && <Radar className={`text-${theme.colors.accent}-400`} />}
                        
                        {activeModal === 'text' && 'Paste Text'}
                        {activeModal === 'website' && 'Import Website'}
                        {activeModal === 'youtube' && 'Import YouTube'}
                        {activeModal === 'file' && `Upload ${fileType?.toUpperCase()}`}
                        {activeModal === 'scout' && 'Nebula Scout'}
                    </h3>

                    {activeModal === 'scout' ? (
                        <div className="space-y-6">
                            <div className={`p-6 bg-${theme.colors.primary}-900/10 border border-${theme.colors.primary}-500/20 rounded-xl`}>
                                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                                    Nebula Scout is an <strong>autonomous research agent</strong>. Give it a topic, and it will search the web, identify high-quality sources, and ingest them into your notebook automatically.
                                </p>
                                <div className="flex w-full gap-2 items-center">
                                    <input 
                                        className={`flex-1 min-w-0 h-14 bg-slate-900 border border-slate-700 rounded-xl px-4 focus:ring-2 focus:ring-${theme.colors.primary}-500 outline-none text-white placeholder-slate-500`}
                                        placeholder="e.g. The future of solid state batteries"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        disabled={isProcessing}
                                        onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleAddSource()}
                                    />
                                    <button 
                                        onClick={handleAddSource}
                                        disabled={isProcessing || !inputValue.trim()}
                                        className={`w-14 h-14 shrink-0 rounded-xl font-bold flex items-center justify-center transition-all ${isProcessing ? 'bg-slate-800 text-slate-500' : `bg-${theme.colors.accent}-600 hover:bg-${theme.colors.accent}-500 text-white shadow-lg`}`}
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin" /> : <Search />}
                                    </button>
                                </div>
                            </div>
                            
                            {isProcessing && (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <div className={`relative w-16 h-16 flex items-center justify-center`}>
                                        <div className={`absolute inset-0 rounded-full border-2 border-${theme.colors.accent}-500/30 animate-ping`}></div>
                                        <div className={`absolute inset-2 rounded-full border-2 border-${theme.colors.accent}-500/50 animate-spin`}></div>
                                        <Radar className={`text-${theme.colors.accent}-400 relative z-10`} size={24} />
                                    </div>
                                    <p className={`text-${theme.colors.accent}-300 font-mono text-sm animate-pulse`}>
                                        {statusMessage || "Initializing Scout..."}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 overflow-y-auto pr-1">
                            <input 
                                className={`w-full bg-slate-900 border border-slate-700 rounded-xl p-4 focus:ring-2 focus:ring-${theme.colors.primary}-500 outline-none transition-all`}
                                placeholder="Title (Optional)"
                                value={titleValue}
                                onChange={(e) => setTitleValue(e.target.value)}
                                disabled={isProcessing}
                            />

                            {activeModal === 'text' && (
                                <textarea 
                                    className={`w-full bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-sm focus:ring-2 focus:ring-${theme.colors.primary}-500 outline-none resize-none min-h-[200px]`}
                                    placeholder="Paste your content here..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={isProcessing}
                                ></textarea>
                            )}

                            {(activeModal === 'website' || activeModal === 'youtube') && (
                                <input 
                                    className={`w-full bg-slate-900 border border-slate-700 rounded-xl p-4 focus:ring-2 focus:ring-${theme.colors.primary}-500 outline-none transition-all font-mono text-sm`}
                                    placeholder={activeModal === 'website' ? "https://example.com/article" : "https://youtube.com/watch?v=..."}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={isProcessing}
                                />
                            )}

                            {activeModal === 'file' && (
                                <div 
                                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${selectedFile ? `border-${theme.colors.primary}-500/50 bg-${theme.colors.primary}-500/5` : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
                                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept={
                                            fileType === 'pdf' ? "application/pdf" : 
                                            fileType === 'audio' ? "audio/*" : 
                                            "image/*"
                                        }
                                        onChange={handleFileSelect}
                                        disabled={isProcessing}
                                    />
                                    {selectedFile ? (
                                        <>
                                            <div className={`w-12 h-12 bg-${theme.colors.primary}-500/20 text-${theme.colors.primary}-400 rounded-full flex items-center justify-center mb-3`}>
                                                <Upload size={24} />
                                            </div>
                                            <p className="font-medium text-slate-200">{selectedFile.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-3">
                                                <Upload size={24} />
                                            </div>
                                            <p className="font-medium text-slate-400">Click to Upload {fileType?.toUpperCase()}</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg">
                                    {error}
                                </div>
                            )}
                            
                            {isProcessing && (
                                <div className={`p-4 bg-${theme.colors.primary}-500/5 border border-${theme.colors.primary}-500/20 rounded-lg flex items-center gap-3`}>
                                    <Loader2 className={`animate-spin text-${theme.colors.primary}-400`} size={20} />
                                    <div className="text-sm">
                                        <p className={`text-${theme.colors.primary}-200 font-medium`}>Processing Source...</p>
                                        <p className={`text-${theme.colors.primary}-500/70 text-xs`}>This may take a few seconds.</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    onClick={resetModal} 
                                    className="px-5 py-2.5 hover:bg-white/10 rounded-xl transition-colors font-medium text-slate-300"
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAddSource}
                                    disabled={isProcessing || (!inputValue && !selectedFile)}
                                    className={`px-8 py-2.5 bg-gradient-to-r from-${theme.colors.primary}-600 to-${theme.colors.secondary}-600 rounded-xl font-bold hover:shadow-lg hover:shadow-${theme.colors.primary}-500/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2`}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <PlusCircle size={18} />}
                                    Add Source
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
      );
    };
    
    export default SourcesTab;
