'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Layout } from '@/app/components/layout/layout';
import { useAuth } from '@/app/contexts/auth-context';
import { PollList } from '@/app/components/polls/poll-list';
import { usePolls } from '@/app/hooks/use-polls';
import { Plus, TrendingUp, Users, BarChart3 } from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const { polls, isLoading } = usePolls({ limit: 3 });

  return (
    <Layout user={user}>
      <div className='min-h-screen'>
        {/* Hero Section */}
        <section className='bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20'>
          <div className='container'>
            <div className='max-w-4xl mx-auto text-center space-y-8'>
              <h1 className='text-4xl md:text-6xl font-bold tracking-tight'>
                Create & Share <span className='text-primary'>Polls</span>{' '}
                Instantly
              </h1>
              <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
                Gather opinions, make decisions, and engage your community with
                our modern polling platform. Simple, fast, and beautiful.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <Button size='lg' asChild>
                  <Link href='/polls/create'>
                    <Plus className='h-5 w-5 mr-2' />
                    Create Your First Poll
                  </Link>
                </Button>
                <Button size='lg' variant='outline' asChild>
                  <Link href='/polls'>Browse Polls</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className='py-20 bg-background'>
          <div className='container'>
            <div className='text-center space-y-4 mb-16'>
              <h2 className='text-3xl font-bold'>Why Choose Alx Polly?</h2>
              <p className='text-muted-foreground max-w-2xl mx-auto'>
                Built with modern technologies and user experience in mind
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
              <Card>
                <CardHeader>
                  <div className='h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4'>
                    <TrendingUp className='h-6 w-6 text-primary' />
                  </div>
                  <CardTitle>Real-time Results</CardTitle>
                  <CardDescription>
                    See poll results update instantly as people vote. No refresh
                    needed.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className='h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4'>
                    <Users className='h-6 w-6 text-primary' />
                  </div>
                  <CardTitle>Community Driven</CardTitle>
                  <CardDescription>
                    Create public polls to engage your community or keep them
                    private for internal use.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className='h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4'>
                    <BarChart3 className='h-6 w-6 text-primary' />
                  </div>
                  <CardTitle>Rich Analytics</CardTitle>
                  <CardDescription>
                    Get detailed insights with beautiful charts and voting
                    statistics.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Recent Polls Section */}
        <section className='py-20 bg-muted/50'>
          <div className='container'>
            <div className='flex items-center justify-between mb-8'>
              <div>
                <h2 className='text-3xl font-bold'>Recent Polls</h2>
                <p className='text-muted-foreground'>
                  See what the community is discussing
                </p>
              </div>
              <Button variant='outline' asChild>
                <Link href='/polls'>View All</Link>
              </Button>
            </div>

            <PollList polls={polls} isLoading={isLoading} />
          </div>
        </section>

        {/* CTA Section */}
        <section className='py-20 bg-primary text-primary-foreground'>
          <div className='container text-center'>
            <div className='max-w-2xl mx-auto space-y-6'>
              <h2 className='text-3xl font-bold'>Ready to Start Polling?</h2>
              <p className='text-xl opacity-90'>
                Join thousands of users who are already creating and
                participating in polls.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                {isAuthenticated ? (
                  <Button size='lg' variant='secondary' asChild>
                    <Link href='/polls/create'>
                      <Plus className='h-5 w-5 mr-2' />
                      Create Poll
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button size='lg' variant='secondary' asChild>
                      <Link href='/auth/register'>Get Started</Link>
                    </Button>
                    <Button size='lg' variant='outline' asChild>
                      <Link href='/auth/login'>Sign In</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
