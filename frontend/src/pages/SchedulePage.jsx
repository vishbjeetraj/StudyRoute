import React, { useState } from 'react';
import StudySchedule from '../components/StudySchedule';
import DisruptionPanel from '../components/DisruptionPanel';
import RerouteResult from '../components/RerouteResult';
import { useApp } from '../context/AppContext';

export default function SchedulePage() {
  const [disruptionOpen, setDisruptionOpen] = useState(false);
  const [resultModalData, setResultModalData] = useState(null);

  const handleRerouteSuccess = (response) => {
    setResultModalData(response);
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem 0' }}>
      <div className="container">
        <StudySchedule onOpenDisruption={() => setDisruptionOpen(true)} />

        {/* Disruption Modal */}
        <DisruptionPanel
          isOpen={disruptionOpen}
          onClose={() => setDisruptionOpen(false)}
          onRerouteSuccess={handleRerouteSuccess}
        />

        {/* Reroute Comparison Diff Modal */}
        {resultModalData && (
          <RerouteResult
            rerouteData={resultModalData}
            onClose={() => setResultModalData(null)}
          />
        )}
      </div>
    </div>
  );
}
