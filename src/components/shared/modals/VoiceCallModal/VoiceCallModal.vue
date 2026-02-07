<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

import useStore from "@src/store/store";
import { getOtherMembers } from "@src/utils";
import rtcClient from "@src/services/rtcClient";

import IncomingTab from "@src/components/shared/modals/VoiceCallModal/IncomingTab.vue";
import OngoingTab from "@src/components/shared/modals/VoiceCallModal/OngoingTab.vue";
import FadeTransition from "@src/components/ui/transitions/FadeTransition.vue";
import Modal from "@src/components/ui/utils/Modal.vue";

const props = defineProps<{
  open: boolean;
  closeModal: (endCall: boolean) => void;
}>();

const store = useStore();

const members = computed(() => {
  if (store.activeCall) {
    return getOtherMembers(store.activeCall);
  }
});

// determine the modal width based on the active component
const modalSize = ref("290px");

// the active modal component
const ActiveTab = computed((): any => {
  if (store.activeCall) {
    if (store?.activeCall.status === "dialing") {
      modalSize.value = "290px";
      return IncomingTab;
    } else if (store?.activeCall.status === "ongoing") {
      modalSize.value = "400px";
      return OngoingTab;
    }
  } else {
    return "div";
  }
});

const handleCallStatusChange = (status: string) => {
  if (store.activeCall) {
    store.activeCall.status = status;
  }
};

const getRoomId = () => {
  const activeCall = store.activeCall as { id?: number } | undefined;
  if (!activeCall) return null;
  if (typeof activeCall.id === "number") return `call-${activeCall.id}`;

  const memberIds = activeCall.members?.map((member) => member.id).join("-");
  return memberIds ? `call-${memberIds}` : null;
};

const connectRtc = async () => {
  if (!store.user || !store.activeCall) return;

  await rtcClient.connect({
    userId: String(store.user.id),
    name: `${store.user.firstName ?? ""} ${store.user.lastName ?? ""}`.trim(),
  });

  const roomId = getRoomId();
  if (roomId) {
    await rtcClient.joinRoom(roomId);
  }
};

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await connectRtc();
      return;
    }

    await rtcClient.disconnect();
  }
);

watch(
  () => store.activeCall,
  async (call, prevCall) => {
    if (!props.open) return;
    if (call?.id !== prevCall?.id) {
      await rtcClient.disconnect();
      await connectRtc();
    }
  }
);

onBeforeUnmount(async () => {
  await rtcClient.disconnect();
});
</script>

<template>
  <Modal :open="props.open" :close-modal="() => props.closeModal(false)">
    <template v-slot:content>
      <div
        class="rounded bg-white dark:bg-gray-800 transition-all duration-300"
        :style="{ width: modalSize }"
      >
        <FadeTransition>
          <component
            :is="ActiveTab"
            :members="members"
            :active-call="store.activeCall"
            :close-modal="() => props.closeModal(true)"
            :handle-call-status-change="handleCallStatusChange"
          />
        </FadeTransition>
      </div>
    </template>
  </Modal>
</template>
