37a762d: digest: sha256:b3ca5e480f449ab5a47022306cd28adc78fdf51347974100f2ed63c3f44b5a2d size: 2623
DONE
---------------------------------------------------------------------------------------------
ID                                    CREATE_TIME                DURATION  SOURCE                                                                                       IMAGES                                                             STATUS
488c6585-f2f9-4ae3-ab6c-7cac1630f684  2025-12-08T13:52:56+00:00  2M54S     gs://aibond-479715_cloudbuild/source/1765201973.046688-bdb4cc4600194073ba31b190b01c4cf6.tgz  asia-northeast1-docker.pkg.dev/aibond-479715/aibond/web (+2 more)  SUCCESS


Updates are available for some Google Cloud CLI components.  To install them,
please run:
  $ gcloud components update



To take a quick anonymous survey, run:
  $ gcloud survey


👤 Checking service account...
✅ Service account already exists

☁️  Deploying to Cloud Run...
Deploying container to Cloud Run service [aibond-web] in project [aibond-479715] region [asia-northeast1]
✓ Deploying... Done.                                                                        
  ✓ Creating Revision...                                                                    
  ✓ Routing traffic...                                                                      
  ✓ Setting IAM Policy...                                                                   
Done.                                                                                       
Service [aibond-web] revision [aibond-web-00015-gnq] has been deployed and is serving 100 percent of traffic.
Service URL: https://aibond-web-694039525012.asia-northeast1.run.app

✅ Deployment completed successfully!

🌐 Service URL: https://aibond-web-nkxkchoz3a-an.a.run.app

Next steps:
1. Test the health check: curl https://aibond-web-nkxkchoz3a-an.a.run.app/api/health
2. Update Stripe webhook URL to: https://aibond-web-nkxkchoz3a-an.a.run.app/api/webhooks/stripe
3. Update Supabase redirect URLs in dashboard