import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { IndoorPathfinder } from '../utils/indoorPathfinder';
import { AllCampusData } from '../data/buildings';

export default function IndoorPathTestScreen() {
  const [fromRoom, setFromRoom] = useState('110');
  const [toRoom, setToRoom] = useState('290');
  const [path, setPath] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleFindPath = () => {
    try {
      const pathfinder = new IndoorPathfinder(AllCampusData as any);
      const result = pathfinder.findShortestPath(fromRoom, toRoom);
      
      if (result && result.length > 0) {
        setPath(result);
        setError('');
      } else {
        setPath([]);
        setError('No path found. Check room labels.');
      }
    } catch (e) {
      setError('Error calculating path.');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Indoor Pathfinding Test" }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>H Building Navigation Test</Text>
        <View style={styles.inputRow}>
          <TextInput 
            style={styles.input} 
            placeholder="From Room (e.g. 110)" 
            value={fromRoom}
            onChangeText={setFromRoom}
          />
          <TextInput 
            style={styles.input} 
            placeholder="To Room (e.g. 290)" 
            value={toRoom}
            onChangeText={setToRoom}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleFindPath}>
          <Text style={styles.buttonText}>Find Optimal Route</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.results}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        {path.length > 0 && (
          <View>
            <Text style={styles.subtitle}>Route Summary ({path.length} steps):</Text>
            {path.map((node, index) => (
              <View key={node.id} style={styles.stepCard}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <View>
                  <Text style={styles.stepText}>
                    Floor {node.floor} - {node.type.replace('_', ' ')}
                  </Text>
                  {node.label ? <Text style={styles.labelText}>Room: {node.label}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#2c3e50', borderBottomWidth: 1, borderColor: '#34495e' },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  input: { backgroundColor: 'white', width: '48%', padding: 10, borderRadius: 5 },
  button: { backgroundColor: '#27ae60', padding: 15, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  results: { padding: 20 },
  subtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  stepCard: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2
  },
  stepNumber: { fontWeight: 'bold', fontSize: 18, marginRight: 15, color: '#27ae60' },
  stepText: { fontSize: 14, color: '#333', textTransform: 'capitalize' },
  labelText: { fontSize: 12, color: '#7f8c8d' },
  errorText: { color: '#e74c3c', textAlign: 'center', marginTop: 20 }
});
