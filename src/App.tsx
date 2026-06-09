import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/Chat/ChatWindow';
import RightPanel from './components/Panel/RightPanel';
import DeliveryRecordDetail from './components/Delivery/DeliveryRecordDetail';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginModal from './auth/LoginModal';
import { mockDeliveryRecords } from './data/mock-delivery-records';
import type { PanelType, PanelContent, Conversation, Campaign, DeliveryRecord } from './types';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { showLogin } = useAuth();
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [conversationKey, setConversationKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState<PanelType>(null);
  const [panelContent, setPanelContent] = useState<PanelContent>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [deliveryRecords] = useState<DeliveryRecord[]>(mockDeliveryRecords);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const selectedRecord = selectedRecordId
    ? deliveryRecords.find(r => r.id === selectedRecordId) ?? null
    : null;

  const handleSkillSelect = (skillId: string | null) => {
    setActiveSkill(skillId);
    setPanelOpen(false);
  };

  const handleClearSkill = () => {
    setActiveSkill(null);
    setPanelOpen(false);
  };

  const handlePanelUpdate = useCallback((type: PanelType, content: PanelContent) => {
    setPanelType(type);
    setPanelContent(content);
    setPanelOpen(true);
  }, []);

  const handleNewChat = () => {
    setConversationKey(prev => prev + 1);
    setPanelOpen(false);
    setActiveSkill(null);
    setActiveConversationId(null);
    setCampaign(null);
    setSelectedRecordId(null);
  };

  const handleConversationStart = useCallback((title: string) => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title,
      date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
      preview: title,
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  }, []);

  const handleConversationSelect = (id: string) => {
    setActiveConversationId(id);
    setSelectedRecordId(null);
  };

  const handleDeliveryRecordSelect = (id: string) => {
    setSelectedRecordId(id);
    setActiveConversationId(null);
  };

  const handleConversationDelete = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  const handleCopyCampaign = useCallback((_title: string) => {
    // Copy a campaign: switch to new chat with appropriate skill pre-selected
    setActiveSkill('outbound');
    setConversationKey(prev => prev + 1);
    setPanelOpen(false);
    setActiveConversationId(null);
    setCampaign(null);
  }, []);

  const hasHistory = conversations.length > 0 || deliveryRecords.length > 0;
  const activeCampaignCount = deliveryRecords.filter(r => r.status === 'executing').length;

  return (
    <div className="h-full gradient-bg relative overflow-hidden">
      {/* Login modal */}
      <LoginModal isOpen={showLogin} />
      {/* Decorative blur orbs for depth */}
      <div className="glass-orb w-[500px] h-[500px] bg-slate-300 -top-40 -right-40" />
      <div className="glass-orb w-[400px] h-[400px] bg-slate-200 -bottom-32 -left-32" />
      <div className="glass-orb w-[300px] h-[300px] bg-slate-300 top-1/2 left-1/3 opacity-30" />

      {/* Sidebar - always visible */}
      <Sidebar
        activeSkill={activeSkill}
        onSkillSelect={handleSkillSelect}
        onNewChat={handleNewChat}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationSelect={handleConversationSelect}
        onConversationDelete={handleConversationDelete}
        deliveryRecords={deliveryRecords}
        activeRecordId={selectedRecordId}
        onDeliveryRecordSelect={handleDeliveryRecordSelect}
        onCopyCampaign={handleCopyCampaign}
      />

      {/* Main content: Chat or Delivery Record Detail + Right Panel */}
      <main className="ml-[280px] h-full relative z-10">
        {selectedRecord ? (
          <DeliveryRecordDetail
            record={selectedRecord}
            onBack={() => setSelectedRecordId(null)}
            onCopyCampaign={handleCopyCampaign}
          />
        ) : (
          <ChatWindow
            key={conversationKey}
            activeSkill={activeSkill}
            onClearSkill={handleClearSkill}
            onPanelUpdate={handlePanelUpdate}
            onConversationStart={handleConversationStart}
            campaign={campaign}
            onCampaignChange={setCampaign}
            hasHistory={hasHistory}
            activeCampaignCount={activeCampaignCount}
          />
        )}

        <RightPanel
          panelType={panelType}
          panelContent={panelContent}
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
        />
      </main>
    </div>
  );
}
