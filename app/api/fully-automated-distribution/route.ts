import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Check if running in serverless environment
    if (process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fully automated distribution is not supported in serverless environments',
          details: 'This feature requires access to child_process and file system which are not available in Netlify/Vercel Functions.',
          suggestions: [
            'Use the manual process instead: Execute Distribution → Generate Merkle Tree → Set Merkle Root',
            'Or deploy a separate automation service (e.g., GitHub Actions, Cron job) to handle this workflow',
            'For local development, this feature works normally'
          ]
        },
        { status: 501 } // 501 Not Implemented
      );
    }

    // Only allow in local development
    const { spawn } = require('child_process');
    const path = require('path');
    
    // Get the project root directory
    const projectRoot = path.join(process.cwd());
    
    // Path to the fully automated distribution script
    const scriptPath = path.join(projectRoot, 'scripts', 'fully-automated-distribution.js');
    
    console.log('Executing fully automated distribution script:', scriptPath);
    
    // Execute the fully automated distribution script using Hardhat
    return new Promise((resolve) => {
      const child = spawn('npx', ['hardhat', 'run', scriptPath], {
        cwd: projectRoot,
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      
      child.on('close', (code: number | null) => {
        console.log('Script output:', stdout);
        
        if (stderr) {
          console.error('Script stderr:', stderr);
        }
        
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: 'Fully automated distribution completed successfully',
            output: stdout
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: `Script exited with code ${code}`,
            output: stdout,
            errorOutput: stderr
          }, { status: 500 }));
        }
      });
      
      child.on('error', (error: Error) => {
        console.error('Failed to start script:', error);
        resolve(NextResponse.json({
          success: false,
          error: 'Failed to start fully automated distribution script',
          details: error.message
        }, { status: 500 }));
      });
    });
  } catch (error: any) {
    console.error('Error executing fully automated distribution:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to execute fully automated distribution',
      details: error.stack
    }, { status: 500 });
  }
}