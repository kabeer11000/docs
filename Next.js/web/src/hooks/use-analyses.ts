import { useStore } from "@nanostores/react";
import type { IAnalysis, IAnalysisCreateInput } from "@shared-types";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useState } from "react";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "@/state/auth";

export function useAnalyses(documentId: string) {
  const [analyses, setAnalyses] = useState<IAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useStore($auth);

  // Watch analyses for this document in real-time
  useEffect(() => {
    if (!cloudStore || !documentId) {
      setIsLoading(false);
      return;
    }

    let watcher: any = null;

    const startWatching = () => {
      try {
        const analysesCollection = cloudStore.collection("analyses");
        const query = cloudStore.query
          .where("documentId", "EQUAL", documentId)
          .orderBy("timestamp.createdAt", "DESCENDING");

        watcher = analysesCollection.watch(
          query,
          ({ collection: data }: { collection: IAnalysis[] }) => {
            console.log("[useAnalyses] Received analyses:", data?.length);
            setAnalyses(data || []);
            setIsLoading(false);
          },
        );
      } catch (error) {
        console.error("Failed to watch analyses:", error);
        setIsLoading(false);
      }
    };

    startWatching();

    return () => {
      if (watcher && typeof watcher.stop === "function") {
        watcher.stop();
      }
    };
  }, [documentId]);

  // Create a new analysis
  const createAnalysis = useCallback(
    async (input: IAnalysisCreateInput): Promise<string | null> => {
      if (!cloudStore || !user) {
        console.error("CloudStore not available or user not authenticated");
        return null;
      }

      try {
        const analysisId = nanoid();
        const timestamp = new Date().toISOString();

        const newAnalysis: IAnalysis = {
          id: analysisId,
          documentId: input.documentId,
          userId: user.id,
          perspective: input.perspective,
          contractType: input.contractType,
          selectedText: input.selectedText,
          riskScore: input.riskScore,
          summary: input.summary,
          redFlags: input.redFlags,
          greenFlags: input.greenFlags,
          timestamp: {
            createdAt: timestamp,
          },
        };

        const analysesCollection = cloudStore.collection("analyses");
        const result = await analysesCollection.insert(newAnalysis);

        console.log(
          "[useAnalyses] Analysis created:",
          analysisId,
          "Result:",
          result,
        );
        return analysisId;
      } catch (error) {
        console.error("Failed to create analysis:", error);
        return null;
      }
    },
    [user],
  );

  // Delete an analysis
  const deleteAnalysis = useCallback(
    async (analysisId: string): Promise<boolean> => {
      if (!cloudStore) {
        console.error("CloudStore not available");
        return false;
      }

      try {
        const analysesCollection = cloudStore.collection("analyses");
        const query = cloudStore.query.where("id", "EQUAL", analysisId);

        const result = await analysesCollection.remove(query);

        console.log(
          "[useAnalyses] Analysis deleted:",
          analysisId,
          "Result:",
          result,
        );
        return true;
      } catch (error) {
        console.error("Failed to delete analysis:", error);
        return false;
      }
    },
    [],
  );

  // Get a specific analysis by ID
  const getAnalysis = useCallback(
    (analysisId: string): IAnalysis | null => {
      return analyses.find((a) => a.id === analysisId) || null;
    },
    [analyses],
  );

  return {
    analyses,
    isLoading,
    createAnalysis,
    deleteAnalysis,
    getAnalysis,
  };
}
