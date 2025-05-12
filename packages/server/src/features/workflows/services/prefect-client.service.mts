import axios, { AxiosInstance } from 'axios';
import { logger } from '../../../utils/logger.mjs';

/**
 * Prefect Flow object
 */
interface PrefectFlow {
  id: string;
  name: string;
  created: string;
  tags: string[];
  [key: string]: unknown;
}

/**
 * Prefect FlowRun object
 */
interface PrefectFlowRun {
  id: string;
  flow_id: string;
  parameters: Record<string, unknown>;
  tags: string[];
  labels: Record<string, string>;
  state: {
    name: string;
    type: string;
  };
  created: string;
  [key: string]: unknown;
}

/**
 * Client for interacting with the Prefect API
 */
export class PrefectClient {
  private client: AxiosInstance;
  private baseUrl: string;

  /**
   * Create a new Prefect client
   */
  constructor() {
    this.baseUrl = process.env.PREFECT_API_URL || 'http://localhost:4200/api';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get a flow by name
   *
   * @param name - The name of the flow
   * @returns The flow object if found
   */
  async getFlowByName(name: string): Promise<PrefectFlow> {
    try {
      logger.info(`Getting flow by name: ${name}`);

      // Using the correct endpoint to get flow by name
      const response = await this.client.get<PrefectFlow>(`/flows/name/${name}`);

      if (!response.data) {
        throw new Error(`Flow not found with name: ${name}`);
      }

      logger.info(`Found flow: ${name} with ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.detail || error.message;
        logger.error(`Error getting flow by name (${statusCode}): ${errorMessage}`);
      } else {
        logger.error(`Error getting flow by name: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Run a flow with parameters
   *
   * @param flowId - The ID of the flow to run
   * @param params - Parameters to pass to the flow
   * @param userId - User ID to add as a label for tracking
   * @returns The flow run object
   */
  async runFlow(
    flowName: string,
    deploymentName: string,
    params: Record<string, unknown>,
    userId: string
  ): Promise<PrefectFlowRun> {
    try {
      logger.info(`Running flow: ${flowName} for user: ${userId}`);
      const deployment = await this.client.get(`/deployments/name/${flowName}/${deploymentName}`);

      // Create the flow run
      const response = await this.client.post<PrefectFlowRun>('/flow_runs', {
        flow_id: deployment.data.flow_id,
        parameters: params,
        work_pool_name: 'process-pool',
        work_queue_name: 'default',
        deployment_id: deployment.data.id,
        labels: {
          userId: userId
        },
        state: {
          type: 'SCHEDULED'
        }
      });

      logger.info(`Started flow run with ID: ${response.data.id}`);
      logger.info(JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.detail || error.message;
        logger.error(`Error running flow (${statusCode}): ${errorMessage}`);
      } else {
        logger.error(`Error running flow: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Get the status of a flow run
   *
   * @param flowRunId - The ID of the flow run
   * @returns The flow run object with status information
   */
  async getFlowRunStatus(flowRunId: string): Promise<PrefectFlowRun> {
    try {
      logger.info(`Getting status for flow run: ${flowRunId}`);
      const response = await this.client.get<PrefectFlowRun>(`/flow_runs/${flowRunId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.detail || error.message;
        logger.error(`Error getting flow run status (${statusCode}): ${errorMessage}`);
      } else {
        logger.error(`Error getting flow run status: ${error}`);
      }
      throw error;
    }
  }
}
