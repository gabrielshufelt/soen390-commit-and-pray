import React, { useState } from 'react';
import { View, Text, TextInput, Modal, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { setUsabilityState, logTestTaskStarted, logTestTaskEnded, ErrorCounts } from '../utils/analytics';

const INITIAL_ERRORS: ErrorCounts = {
  nav_error_count: 0,
  misclick_count: 0,
  help_asked_count: 0,
  confused_count: 0,
};

const ERROR_LABELS: { key: keyof ErrorCounts; label: string }[] = [
  { key: 'nav_error_count', label: 'Nav Error' },
  { key: 'misclick_count', label: 'Misclick' },
  { key: 'help_asked_count', label: 'Help Asked' },
  { key: 'confused_count', label: 'Confused' },
];

export const UsabilityDevMenu = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const [participantId, setParticipantId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [isTaskActive, setIsTaskActive] = useState(false);
  const [errors, setErrors] = useState<ErrorCounts>(INITIAL_ERRORS);

  const handleStartTask = () => {
    if (!participantId || !taskId) return;
    setUsabilityState(participantId, taskId);
    logTestTaskStarted();
    setErrors(INITIAL_ERRORS);
    setIsTaskActive(true);
    onClose();
  };

  const handleEndTask = (status: 'pass' | 'fail' | 'abandoned') => {
    logTestTaskEnded(status, errors);
    setUsabilityState(null, null);
    setIsTaskActive(false);
    setTaskId('');
    setErrors(INITIAL_ERRORS);
    onClose();
  };

  const adjustCount = (key: keyof ErrorCounts, delta: number) => {
    setErrors(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <SafeAreaView style={styles.centeredView}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.modalView}>
            <Text style={styles.title}>Usability Testing Dev Menu</Text>

            <TextInput
              style={styles.input}
              placeholder="Participant ID (e.g. P1)"
              value={participantId}
              onChangeText={setParticipantId}
              editable={!isTaskActive}
            />
            <TextInput
              style={styles.input}
              placeholder="Task ID (e.g. task_1)"
              value={taskId}
              onChangeText={setTaskId}
              editable={!isTaskActive}
            />

            {!isTaskActive ? (
              <Pressable style={[styles.button, styles.buttonOpen]} onPress={handleStartTask}>
                <Text style={styles.textStyle}>Start Task Tracking</Text>
              </Pressable>
            ) : (
              <View style={styles.activeActions}>
                <Text style={styles.statusText}>Active: {participantId} — {taskId}</Text>

                <Text style={styles.sectionLabel}>Error Counts (tally after task)</Text>
                {ERROR_LABELS.map(({ key, label }) => (
                  <View key={key} style={styles.counterRow}>
                    <Text style={styles.counterLabel}>{label}</Text>
                    <Pressable style={styles.counterBtn} onPress={() => adjustCount(key, -1)}>
                      <Text style={styles.counterBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.counterValue}>{errors[key]}</Text>
                    <Pressable style={styles.counterBtn} onPress={() => adjustCount(key, 1)}>
                      <Text style={styles.counterBtnText}>+</Text>
                    </Pressable>
                  </View>
                ))}

                <Text style={styles.sectionLabel}>End Task</Text>
                <Pressable style={[styles.button, styles.buttonPass]} onPress={() => handleEndTask('pass')}>
                  <Text style={styles.textStyle}>End: Pass</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.buttonFail]} onPress={() => handleEndTask('fail')}>
                  <Text style={styles.textStyle}>End: Fail</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.buttonFail]} onPress={() => handleEndTask('abandoned')}>
                  <Text style={styles.textStyle}>End: Abandoned</Text>
                </Pressable>
              </View>
            )}

            <Pressable style={[styles.button, styles.buttonClose]} onPress={onClose}>
              <Text style={styles.textStyle}>Close Menu</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  modalView: {
    margin: 20, backgroundColor: 'white', borderRadius: 10, padding: 35,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 15, paddingHorizontal: 10, borderRadius: 5 },
  button: { borderRadius: 5, padding: 10, elevation: 2, marginBottom: 10 },
  buttonOpen: { backgroundColor: '#2196F3' },
  buttonPass: { backgroundColor: '#4CAF50' },
  buttonFail: { backgroundColor: '#F44336' },
  buttonClose: { backgroundColor: '#999', marginTop: 20 },
  textStyle: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  activeActions: { marginTop: 10 },
  statusText: { marginBottom: 10, fontWeight: 'bold', textAlign: 'center', color: 'red' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 10, marginBottom: 6 },
  counterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  counterLabel: { flex: 1, fontSize: 14 },
  counterBtn: { width: 32, height: 32, borderRadius: 4, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontSize: 20, fontWeight: 'bold', color: '#333', lineHeight: 24 },
  counterValue: { width: 32, textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
});