/* istanbul ignore file */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { IndoorPathfinder, IndoorNode } from '../utils/indoorPathfinder';
import { AllCampusData } from '../data/buildings';

export default function IndoorPathTestScreen() {
  const [fromRoom, setFromRoom] = useState('110');
  const [toRoom, setToRoom] = useState('290');
  const [path, setPath] = useState<IndoorNode[]>([]); // gotchu YASS
  const [error, setError] = useState('');

  const handleFindPath = () => {
    try {
      const pathfinder = new IndoorPathfinder(AllCampusData as any);
      
      // for task 79, this is for you yassine to see if data is missing
      console.log(`Pathfinding initialized: ${fromRoom} -> ${toRoom}`);

      const result = pathfinder.findShortestPath(fromRoom.trim(), toRoom.trim());
      
      if (result && result.length > 0) {
        setPath(result);
        setError('');
      } else {
        setPath([]);
        setError(`No route found. Ensure rooms exist in the JSON data.`);
      }
    } catch (e) {
      console.error(e);
      setError('Pathfinding error. check console.');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Indoor Navigation Test" }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Algorithm Testing Tool</Text>
        <View style={styles.inputRow}>
          <TextInput 
            style={styles.input} 
            placeholder="From" 
            value={fromRoom}
            onChangeText={setFromRoom}
            autoCapitalize="none"
          />
          <TextInput 
            style={styles.input} 
            placeholder="To" 
            value={toRoom}
            onChangeText={setToRoom}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleFindPath}>
          <Text style={styles.buttonText}>Compute Dijkstra Path</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.results}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        {path.length > 0 && (
          <View>
            <Text style={styles.subtitle}>Nodes in Path: {path.length}</Text>
            {path.map((node, index) => (
              <View key={`${node.id}-${index}`} style={styles.stepCard}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <View>
                  <Text style={styles.stepText}>
                    Floor {node.floor} — {node.type.replace('_', ' ')}
                  </Text>
                  <Text style={styles.labelText}>ID: {node.id} {node.label ? `(${node.label})` : ''}</Text>
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
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: { 
    padding: 20, 
    backgroundColor: '#2c3e50', 
    borderBottomWidth: 1, 
    borderColor: '#34495e' 
  },
  title: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15 
  },
  inputRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },
  input: { 
    backgroundColor: 'white', 
    width: '48%', 
    padding: 10, 
    borderRadius: 5 
  },
  button: { 
    backgroundColor: '#27ae60', 
    padding: 15, 
    borderRadius: 5, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: 'white', 
    fontWeight: 'bold' 
  },
  results: { 
    padding: 20 
  },
  subtitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 10,
    color: '#2c3e50'
  },
  stepCard: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  stepNumber: { 
    fontWeight: 'bold', 
    fontSize: 18, 
    marginRight: 15, 
    color: '#27ae60' 
  },
  stepText: { 
    fontSize: 14, 
    color: '#333', 
    textTransform: 'capitalize',
    fontWeight: '500'
  },
  labelText: { 
    fontSize: 12, 
    color: '#7f8c8d',
    marginTop: 2 
  },
  errorText: { 
    color: '#e74c3c', 
    textAlign: 'center', 
    marginTop: 20,
    fontWeight: 'bold'
  }
});
