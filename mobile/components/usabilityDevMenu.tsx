import React, { useState } from 'react';
import { View, Text, TextInput, Modal, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { setUsabilityState, logTestTaskStarted, logTestTaskEnded } from '../utils/analytics';

export const UsabilityDevMenu = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const [participantId, setParticipantId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [isTaskActive, setIsTaskActive] = useState(false);

  const handleStartTask = () => {
    if (!participantId || !taskId) return;
    setUsabilityState(participantId, taskId);
    logTestTaskStarted();
    setIsTaskActive(true);
    onClose();
  };

  const handleEndTask = (status: 'pass' | 'fail' | 'abandoned') => {
    logTestTaskEnded(status);
    setUsabilityState(null, null);
    setIsTaskActive(false);
    setTaskId(''); 
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <SafeAreaView style={styles.centeredView}>
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
              <Text style={styles.statusText}>Active Phase: {participantId} - {taskId}</Text>
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
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
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
  statusText: { marginBottom: 10, fontWeight: 'bold', textAlign: 'center', color: 'red' }
});