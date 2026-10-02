import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('sync_roster', Path(__file__).parents[1] / 'scripts/sync_roster.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

class RosterTests(unittest.TestCase):
    def payload(self, rows):
        return {'schemaVersion':1, 'complete':True, 'source':{'spreadsheetId':sync.SOURCE_ID,'sheet':sync.SOURCE_SHEET},'agents':rows}

    def row(self, name='Test Agent', email='test@example.com'):
        return dict(name=name,email=email,phone='123',license='RS123',nmls='2578349 ',office='Allentown',languages='English',instagram_handle='@test')

    def test_membership_contact_updates_and_photo_preservation(self):
        old={'agents':[dict(self.row(),headshot='https://example.com/photo.jpg',title='Manager'), self.row('Former Agent','former@example.com')]}
        before=copy.deepcopy(old)
        row=self.row();row['phone']='456';row['birthday']='PRIVATE'
        result=sync.rebuild(self.payload([row,self.row('New Person','new@example.com')]),old,{'New Person':'New_Person.jpg'},True)
        by_email={a['email']:a for a in result['agents']}
        self.assertNotIn('former@example.com',by_email)
        self.assertEqual(by_email['test@example.com']['phone'],'456')
        self.assertEqual(by_email['test@example.com']['headshot'],'https://example.com/photo.jpg')
        self.assertEqual(by_email['test@example.com']['title'],'Manager')
        self.assertEqual(by_email['new@example.com']['headshot'],sync.HEADSHOT_BASE+'New_Person.jpg')
        self.assertNotIn('birthday',by_email['test@example.com'])
        self.assertEqual(old,before)

    def test_roles_numbers_and_application_url(self):
        row=self.row('Test Agent*');row['license']='C.O.O.';row['apply_url']='https://example.com/apply?lo=1'
        agent=sync.rebuild(self.payload([row]),{'agents':[]},{})['agents'][0]
        self.assertEqual(agent['name'],'Test Agent')
        self.assertEqual(agent['title'],'C.O.O.')
        self.assertEqual(agent['license'],'')
        self.assertEqual(agent['nmls'],'2578349')
        self.assertEqual(agent['instagram_url'],'https://www.instagram.com/test/')
        self.assertEqual(agent['apply_url'],row['apply_url'])

    def test_bad_exports_fail_without_mutating_previous(self):
        valid=self.payload([self.row()])
        bad=[{},self.payload([]),dict(valid,complete=False),dict(valid,source={}),self.payload([self.row(),self.row()])]
        for field,value in [('email',''),('name',''),('nmls','unknown'),('apply_url','javascript:alert(1)')]:
            row=self.row();row[field]=value;bad.append(self.payload([row]))
        for payload in bad:
            with self.subTest(payload=payload),self.assertRaises(ValueError):
                sync.rebuild(payload,{'agents':[]},{})

    def test_large_removal_requires_manual_override(self):
        old={'agents':[self.row('A','a@example.com'),self.row('B','b@example.com')]}
        payload=self.payload([self.row('A','a@example.com')])
        with self.assertRaises(ValueError):sync.rebuild(payload,old,{})
        self.assertEqual(len(sync.rebuild(payload,old,{},True)['agents']),1)

if __name__=='__main__':unittest.main()
