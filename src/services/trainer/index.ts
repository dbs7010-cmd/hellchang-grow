import { AITrainerService } from '@/services/trainer/ai-trainer-service';
import { OfflineTrainerService } from '@/services/trainer/offline-trainer-service';
import { RemoteTrainerService, resolveTrainerEndpointUrl } from '@/services/trainer/remote-trainer-service';

/**
 * 실제 PT 백엔드가 설정돼 있으면 그것을, 없으면 기록 기반 오프라인 PT를 쓴다.
 * 이 선택은 앱 시작 시 한 번만 하고, 화면은 aiTrainerService.isAiConnected만 본다.
 */
function resolveTrainerService(): AITrainerService {
  const endpointUrl = resolveTrainerEndpointUrl();
  return endpointUrl ? new RemoteTrainerService(endpointUrl) : new OfflineTrainerService();
}

export const aiTrainerService: AITrainerService = resolveTrainerService();
