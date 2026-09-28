import Chat from "@/components/Chat";
import { DEFAULT_MODEL_ID, fallbackModels } from "@/data/models";

export default function Home() {
  return (
    <Chat
      initialModels={fallbackModels}
      initialModelId={DEFAULT_MODEL_ID}
    />
  );
}
